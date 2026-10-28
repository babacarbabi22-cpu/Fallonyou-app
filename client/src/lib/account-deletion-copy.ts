import type { Language } from "./i18n";

export const accountDeletionCopy: Record<Language, { deleting: string; waiting: string; title: string; uncertainTitle: string; uncertain: string }> = {
  es: {
    deleting: "Eliminando tu cuenta…",
    waiting: "Estamos procesando la eliminación. Espera la confirmación; puede tardar unos momentos.",
    title: "Cuenta eliminada",
    uncertainTitle: "Resultado sin confirmar",
    uncertain: "No hemos podido confirmar el resultado. Si la cuenta ya se eliminó, tu sesión dejará de funcionar. Comprueba tu conexión antes de volver a intentarlo.",
  },
  en: {
    deleting: "Deleting your account…",
    waiting: "We’re processing the deletion. Please wait for confirmation; this may take a few moments.",
    title: "Account deleted",
    uncertainTitle: "Result not confirmed",
    uncertain: "We couldn’t confirm the result. If the account was deleted, your session will no longer work. Check your connection before trying again.",
  },
  fr: {
    deleting: "Suppression de votre compte…",
    waiting: "Nous traitons la suppression. Veuillez attendre la confirmation ; cela peut prendre quelques instants.",
    title: "Compte supprimé",
    uncertainTitle: "Résultat non confirmé",
    uncertain: "Nous n’avons pas pu confirmer le résultat. Si le compte a été supprimé, votre session ne fonctionnera plus. Vérifiez votre connexion avant de réessayer.",
  },
  sv: {
    deleting: "Raderar ditt konto…",
    waiting: "Vi behandlar raderingen. Vänta på bekräftelsen; det kan ta en liten stund.",
    title: "Kontot har raderats",
    uncertainTitle: "Resultatet har inte bekräftats",
    uncertain: "Vi kunde inte bekräfta resultatet. Om kontot har raderats fungerar din session inte längre. Kontrollera anslutningen innan du försöker igen.",
  },
};
