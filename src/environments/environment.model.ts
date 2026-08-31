/** Shape of the environment object. Typed explicitly so the four
 *  `(environment as any).xBase` casts the v1 app needed are gone. */
export interface AppEnvironment {
  production: boolean;
  appName: string;
  serverUrl: string;
  siteUrl: string;
  aiBase: string;
  userBase: string;
  partnerBase: string;
  adminBase: string;
  ownerBase: string;
  emergencyNumbers: { all: string; ambulance: string };
  instagram: { handle: string; url: string };
  whatsapp: { cc: string; subscriber: string; text: string };
  firebaseConfig: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
    measurementId: string;
  };
}
