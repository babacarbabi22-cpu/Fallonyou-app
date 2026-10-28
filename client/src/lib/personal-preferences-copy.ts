import type { Language } from "./i18n";
export const personalPreferencesCopy: Record<Language, {
  title: string; consent: string; optional: string; required: string;
  withdraw: string; withdrawConfirm: string; legacy: string; clear: string; clearConfirm: string;
}> = {
  es: {
    title: "Privacidad de preferencias",
    consent: "Consiento explícitamente que FallOnYou trate mis preferencias personales para filtrar miembros según mis opciones. Estas preferencias pueden revelar información sensible.",
    optional: "Es opcional: puedes ver a todo el mundo sin dar este permiso. Tus preferencias no se publican como campos de tu perfil. Puedes retirar el permiso y borrar estas preferencias aquí.",
    required: "Autoriza las preferencias opcionales o elige «Todo el mundo».",
    withdraw: "Retirar permiso y borrar preferencias",
    withdrawConfirm: "Se borrarán tus preferencias personales y se quitará el filtro de género. Tu cuenta, fotos y mensajes no se eliminan. ¿Continuar?",
    legacy: "Esta versión ya no recoge ni publica religión, política ni tipo de relación. Los datos antiguos sólo se muestran aquí para que puedas eliminarlos.",
    clear: "Eliminar estos datos antiguos",
    clearConfirm: "¿Eliminar de tu perfil los datos antiguos de religión, política y tipo de relación? No se borrarán otros datos.",
  },
  en: {
    title: "Preference privacy",
    consent: "I explicitly consent to FallOnYou processing my personal preferences to filter members according to my choices. These preferences may reveal sensitive information.",
    optional: "This is optional: you can see everyone without this permission. Your preferences are not published as profile fields. You can withdraw permission and delete these preferences here.",
    required: "Allow optional preferences or choose Everyone.",
    withdraw: "Withdraw permission and delete preferences",
    withdrawConfirm: "Your personal preferences will be deleted and the gender filter removed. Your account, photos and messages will not be deleted. Continue?",
    legacy: "This version no longer collects or publishes religion, politics or relationship type. Older values are shown only here so you can delete them.",
    clear: "Delete these older details",
    clearConfirm: "Delete your older religion, politics and relationship-type profile details? Other data will not be deleted.",
  },
  fr: {
    title: "Confidentialité des préférences",
    consent: "Je consens explicitement au traitement de mes préférences personnelles par FallOnYou pour filtrer les membres selon mes choix. Elles peuvent révéler des informations sensibles.",
    optional: "C'est facultatif : vous pouvez voir tout le monde sans cette autorisation. Ces préférences ne sont pas publiées dans votre profil. Vous pouvez retirer l'autorisation et les supprimer ici.",
    required: "Autorisez les préférences facultatives ou choisissez Tout le monde.",
    withdraw: "Retirer l'autorisation et supprimer les préférences",
    withdrawConfirm: "Vos préférences personnelles seront supprimées et le filtre de genre retiré. Votre compte, photos et messages ne seront pas supprimés. Continuer ?",
    legacy: "Cette version ne recueille ni ne publie religion, politique ou type de relation. Les anciennes valeurs sont affichées uniquement ici pour permettre leur suppression.",
    clear: "Supprimer ces anciennes informations",
    clearConfirm: "Supprimer les anciennes données de religion, politique et type de relation du profil ? Les autres données seront conservées.",
  },
  sv: {
    title: "Inställningarnas integritet",
    consent: "Jag samtycker uttryckligen till att FallOnYou behandlar mina personliga preferenser för att filtrera medlemmar enligt mina val. De kan avslöja känsliga uppgifter.",
    optional: "Det är frivilligt: du kan se alla utan detta tillstånd. Preferenserna publiceras inte som profilfält. Du kan återkalla tillståndet och radera preferenserna här.",
    required: "Godkänn frivilliga preferenser eller välj Alla.",
    withdraw: "Återkalla tillstånd och radera preferenser",
    withdrawConfirm: "Dina personliga preferenser raderas och könsfiltret tas bort. Konto, bilder och meddelanden raderas inte. Fortsätta?",
    legacy: "Den här versionen samlar inte in eller publicerar religion, politik eller relationstyp. Äldre uppgifter visas bara här så att du kan radera dem.",
    clear: "Radera dessa äldre uppgifter",
    clearConfirm: "Radera äldre uppgifter om religion, politik och relationstyp i din profil? Andra uppgifter behålls.",
  },
};