import { Link } from "wouter";
import { Mail } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const copy = {
  es: { intro: "¿Necesitas ayuda con FallOnYou? Escríbenos y cuéntanos qué ha pasado.", email: "Contactar por correo", privacy: "Política de privacidad", terms: "Condiciones de uso" },
  en: { intro: "Need help with FallOnYou? Email us and tell us what happened.", email: "Email support", privacy: "Privacy policy", terms: "Terms of use" },
  fr: { intro: "Besoin d'aide avec FallOnYou ? Écrivez-nous et expliquez-nous ce qui s'est passé.", email: "Contacter par e-mail", privacy: "Politique de confidentialité", terms: "Conditions d'utilisation" },
  sv: { intro: "Behöver du hjälp med FallOnYou? Mejla oss och berätta vad som hänt.", email: "Kontakta oss via e-post", privacy: "Integritetspolicy", terms: "Användarvillkor" },
};

export default function SupportPage() {
  const { language, t } = useI18n();
  const text = copy[language];

  return (
    <main className="min-h-screen bg-background p-6">
      <Card className="mx-auto mt-12 max-w-lg">
        <CardHeader>
          <CardTitle>{t.settings.support}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p>{text.intro}</p>
          <Button asChild>
            <a href={`mailto:${t.settings.contactEmail}`}><Mail className="mr-2 h-4 w-4" />{text.email}</a>
          </Button>
          <p className="break-all text-sm text-muted-foreground">{t.settings.contactEmail}</p>
          <div className="flex flex-wrap gap-4 text-sm">
            <Link href="/privacy" className="underline">{text.privacy}</Link>
            <Link href="/legal" className="underline">{text.terms}</Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}