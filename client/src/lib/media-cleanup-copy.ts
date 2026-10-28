import type { Language } from "./i18n";

export const mediaCleanupCopy: Record<Language, {
  title: string; queued: string; done: string; explanation: string;
  review: string; retry: string; error: string; home: string; disabled: string; pending: string;
}> = {
  es: {
    title: "Eliminación de archivos", queued: "Tu cuenta se ha eliminado. La eliminación de los archivos almacenados está en cola.",
    done: "Tu cuenta se ha eliminado. No se han encontrado archivos almacenados pendientes.",
    explanation: "La cuenta y sus registros se eliminan al confirmar. Los archivos propios se eliminan en segundo plano con reintentos si falla el almacenamiento. Los archivos antiguos cuya propiedad no pueda verificarse requieren revisión manual; no se borran archivos ajenos.",
    review: "Requieren revisión", retry: "Reintentar con las mismas comprobaciones",
    disabled: "Modo desarrollo: no se ejecutan borrados reales del almacenamiento.", pending: "Pendientes",
    error: "No se pudo consultar o actualizar la eliminación de archivos.", home: "Ir al inicio",
  },
  en: {
    title: "File deletion", queued: "Your account has been deleted. Stored file deletion is queued.",
    done: "Your account has been deleted. No pending stored files were found.",
    explanation: "Your account and records are removed on confirmation. Your files are deleted in the background, with retries if storage fails. Older files whose ownership cannot be verified require manual review; other people's files are not deleted.",
    review: "Require review", retry: "Retry with the same ownership checks",
    disabled: "Development mode: real storage deletion is disabled.", pending: "Pending",
    error: "Could not check or update file deletion.", home: "Go to home",
  },
  fr: {
    title: "Suppression des fichiers", queued: "Votre compte a été supprimé. La suppression des fichiers stockés est en attente.",
    done: "Votre compte a été supprimé. Aucun fichier stocké en attente n'a été trouvé.",
    explanation: "Votre compte et ses données sont supprimés à la confirmation. Vos fichiers sont supprimés en arrière-plan, avec de nouvelles tentatives si le stockage échoue. Les anciens fichiers dont la propriété ne peut être vérifiée nécessitent un examen manuel ; les fichiers d'autres personnes ne sont pas supprimés.",
    review: "Examen nécessaire", retry: "Réessayer avec les mêmes vérifications",
    disabled: "Mode développement : la suppression réelle du stockage est désactivée.", pending: "En attente",
    error: "Impossible de consulter ou de mettre à jour la suppression des fichiers.", home: "Aller à l'accueil",
  },
  sv: {
    title: "Radering av filer", queued: "Ditt konto har raderats. Radering av lagrade filer är köad.",
    done: "Ditt konto har raderats. Inga väntande lagrade filer hittades.",
    explanation: "Ditt konto och dess uppgifter raderas vid bekräftelse. Dina filer raderas i bakgrunden, med nya försök om lagringen misslyckas. Äldre filer vars ägare inte kan verifieras kräver manuell granskning; andra personers filer raderas inte.",
    review: "Kräver granskning", retry: "Försök igen med samma ägarkontroller",
    disabled: "Utvecklingsläge: verklig radering från lagringen är avstängd.", pending: "Väntande",
    error: "Kunde inte kontrollera eller uppdatera filraderingen.", home: "Gå till startsidan",
  },
};