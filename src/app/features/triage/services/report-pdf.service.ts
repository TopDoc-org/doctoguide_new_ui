import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import { Report } from '../models';

// Generates the health report + SOAP note as PDFs entirely on the client from
// the Report object. No backend round-trip, so downloads work regardless of the
// server PDF endpoint's availability.
@Injectable({ providedIn: 'root' })
export class ReportPdfService {
  private readonly margin = 48;
  private readonly lineGap = 4;

  // ---- public API ----------------------------------------------------------

  downloadReport(report: Report, appName: string, fileName: string): void {
    const w = this.newWriter(report, appName, 'Health Summary');
    this.writeFullReport(w, report);
    this.finish(w, report);
    w.doc.save(fileName);
  }

  downloadSoap(report: Report, appName: string, fileName: string): void {
    const w = this.newWriter(report, appName, 'Clinical SOAP Note');
    this.writeSoap(w, report);
    this.finish(w, report);
    w.doc.save(fileName);
  }

  // ---- writer plumbing ------------------------------------------------------

  private newWriter(report: Report, appName: string, docTitle: string): Writer {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const w: Writer = {
      doc,
      pageW,
      pageH,
      maxW: pageW - this.margin * 2,
      y: this.margin,
    };

    // Brand header band.
    doc.setFillColor(13, 148, 136); // teal-600
    doc.rect(0, 0, pageW, 64, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(appName, this.margin, 30);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(docTitle, this.margin, 48);
    const dateStr = report.generatedAt
      ? new Date(report.generatedAt).toLocaleString()
      : new Date().toLocaleString();
    doc.text(dateStr, pageW - this.margin, 48, { align: 'right' });

    w.y = 88;
    doc.setTextColor(17, 24, 39);
    return w;
  }

  // Move the cursor down, adding a page when we'd overflow the bottom margin.
  private ensure(w: Writer, needed: number): void {
    if (w.y + needed > w.pageH - this.margin) {
      w.doc.addPage();
      w.y = this.margin;
    }
  }

  private heading(w: Writer, text: string): void {
    this.ensure(w, 28);
    w.y += 8;
    w.doc.setFont('helvetica', 'bold');
    w.doc.setFontSize(13);
    w.doc.setTextColor(15, 118, 110); // teal-700
    w.doc.text(text, this.margin, w.y);
    w.y += 6;
    w.doc.setDrawColor(204, 251, 241); // teal-100
    w.doc.line(this.margin, w.y, w.pageW - this.margin, w.y);
    w.y += 12;
    w.doc.setTextColor(17, 24, 39);
  }

  // jsPDF's built-in Helvetica is Latin-1 only. LLM text often contains
  // non-breaking hyphens (U+2011), narrow spaces (U+202F), smart quotes etc. —
  // these break jsPDF's width measurement so lines neither wrap nor clip
  // correctly (stretched, cut off at the page edge). Normalize to ASCII.
  private sanitize(text: string): string {
    return String(text)
      .replace(/[\u2010-\u2015\u2212]/g, '-') // hyphens & dashes (incl. non-breaking U+2011)
      .replace(/[\u2018\u2019\u201A\u2032]/g, "'") // smart single quotes
      .replace(/[\u201C\u201D\u201E\u2033]/g, '"') // smart double quotes
      .replace(/[\u00A0\u2000-\u200B\u202F\u205F\u3000]/g, ' ') // exotic spaces (incl. narrow nbsp U+202F)
      .replace(/\u2026/g, '...')
      .replace(/[\u2022\u00B7]/g, '-')
      .replace(/[^\x20-\x7E\n]/g, ''); // drop anything else non-printable-ASCII
  }

  private para(
    w: Writer,
    text: string,
    opts: { bold?: boolean; size?: number; indent?: number; color?: [number, number, number] } = {}
  ): void {
    if (!text) return;
    text = this.sanitize(text);
    const size = opts.size ?? 10.5;
    const indent = opts.indent ?? 0;
    w.doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
    w.doc.setFontSize(size);
    w.doc.setTextColor(...(opts.color ?? [31, 41, 55]));
    const lines: string[] = w.doc.splitTextToSize(text, w.maxW - indent);
    const lh = size + this.lineGap;
    for (const ln of lines) {
      this.ensure(w, lh);
      w.doc.text(ln, this.margin + indent, w.y);
      w.y += lh;
    }
    w.doc.setTextColor(31, 41, 55);
  }

  private bullet(w: Writer, text: string): void {
    if (!text) return;
    text = this.sanitize(text);
    const size = 10.5;
    const lh = size + this.lineGap;
    w.doc.setFont('helvetica', 'normal');
    w.doc.setFontSize(size);
    const lines: string[] = w.doc.splitTextToSize(text, w.maxW - 16);
    lines.forEach((ln: string, i: number) => {
      this.ensure(w, lh);
      if (i === 0) {
        w.doc.setTextColor(13, 148, 136);
        w.doc.text('•', this.margin + 2, w.y);
        w.doc.setTextColor(31, 41, 55);
      }
      w.doc.text(ln, this.margin + 16, w.y);
      w.y += lh;
    });
  }

  private gap(w: Writer, h = 6): void {
    w.y += h;
  }

  // ---- content --------------------------------------------------------------

  private writeFullReport(w: Writer, r: Report): void {
    const specs = r.suggestedSpecialties || [];
    if (specs.length > 1) {
      this.para(w, 'Suggested specialists:', { bold: true, size: 11 });
      for (const s of specs) {
        this.para(w, s.why ? `${s.specialty} — ${s.why}` : s.specialty, { indent: 14 });
      }
    } else {
      this.para(w, `Suggested specialist: ${r.suggestedSpecialty}`, { bold: true, size: 11 });
    }
    this.gap(w);

    this.heading(w, 'Summary');
    this.para(w, r.summary);

    if (r.assessmentIntro) {
      this.gap(w);
      this.para(w, r.assessmentIntro, { color: [75, 85, 99] });
    }

    if (r.possibleCauses?.length) {
      this.heading(w, 'Possible areas to discuss with a doctor');
      r.possibleCauses.forEach((c, i) => {
        const tag = c.likelihood ? `  (${c.likelihood})` : '';
        this.para(w, `${i + 1}. ${c.cause}${tag}`, { bold: true });
        if (c.note) this.para(w, c.note, { indent: 14, color: [75, 85, 99] });
        this.gap(w, 4);
      });
    }

    const p = r.plan;
    if (p) {
      this.heading(w, 'Topics a doctor may explore');
      if (p.labs?.length) {
        this.para(w, 'Tests a doctor might discuss', { bold: true });
        p.labs.forEach((l) => this.bullet(w, l.why ? `${l.name} — ${l.why}` : l.name));
        this.gap(w, 4);
      }
      if (p.imaging?.length) {
        this.para(w, 'Imaging a doctor might discuss', { bold: true });
        p.imaging.forEach((im) => this.bullet(w, im.why ? `${im.name} — ${im.why}` : im.name));
        this.gap(w, 4);
      }
      if (p.management?.length) {
        this.para(w, 'Self-care & home remedies you can try', { bold: true });
        p.management.forEach((m) => this.bullet(w, m));
        this.gap(w, 4);
      }
      if (p.referral) {
        this.para(w, 'Referral', { bold: true });
        this.para(w, p.referral);
        this.gap(w, 4);
      }
      if (p.whenToSeekUrgent) {
        this.para(w, 'When to seek urgent care', { bold: true, color: [185, 28, 28] });
        this.para(w, p.whenToSeekUrgent, { color: [185, 28, 28] });
      }
    }

    const conf = r.confidence;
    if (conf) {
      this.heading(w, 'AI confidence in this summary');
      this.para(w, `Score: ${conf.score}/100 (${conf.level})`, { bold: true });
      conf.factors?.forEach((f) => this.bullet(w, f));
      if (conf.missing?.length) {
        this.gap(w, 4);
        this.para(w, 'What could change this assessment', { bold: true });
        conf.missing.forEach((m) => this.bullet(w, m));
      }
      this.gap(w, 4);
      this.para(
        w,
        "This reflects the AI's own estimate of how well the interview supports this summary — not diagnostic certainty.",
        { size: 9, color: [107, 114, 128] }
      );
    }

    this.writeSoap(w, r);
  }

  private writeSoap(w: Writer, r: Report): void {
    this.heading(w, 'SOAP note (for your doctor)');
    const soap = r.soap || {};
    const sections: [string, string | undefined][] = [
      ['Subjective', soap.subjective],
      ['Objective', soap.objective],
      ['Assessment', soap.assessment],
      ['Plan', soap.plan],
    ];
    for (const [label, val] of sections) {
      this.para(w, label, { bold: true, color: [15, 118, 110] });
      for (const line of this.toBullets(val)) this.bullet(w, line);
      this.gap(w, 4);
    }
  }

  private finish(w: Writer, r: Report): void {
    this.gap(w, 10);
    const disclaimer =
      r.disclaimer ||
      'This summary is AI-generated health information, not a diagnosis or medical advice. ' +
        'Always consult a licensed physician about your symptoms.';
    this.ensure(w, 40);
    w.doc.setDrawColor(229, 231, 235);
    w.doc.line(this.margin, w.y, w.pageW - this.margin, w.y);
    w.y += 12;
    this.para(w, disclaimer, { size: 8.5, color: [107, 114, 128] });
  }

  // Splits multi-line / sentence text into bullet lines. Mirrors the UI helper
  // (toBullets in triage-shell) — including the ";" split — so the PDF carries
  // the same bullets the user saw on screen.
  private toBullets(val?: string): string[] {
    if (!val) return [];
    return this.sanitize(val)
      .split(/\n|;\s*|(?<=\.)\s+(?=[A-Z])/)
      .map((s) => s.trim().replace(/\.$/, ''))
      .filter((s) => s.length > 1);
  }
}

interface Writer {
  doc: jsPDF;
  pageW: number;
  pageH: number;
  maxW: number;
  y: number;
}
