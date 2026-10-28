import type { WritingLanguage } from "./writing-course";

// Longer, independent phrases for the Premium memory challenge.
// Keep four exercises per stage so saved progress and submission contracts stay stable.
export const writingChallenges: Record<WritingLanguage, string[]> = {
  en: [
    "Although our train was delayed, we managed to arrive before the museum closed.",
    "If I had known about the local festival, I would have stayed for another night.",
    "Could you recommend a quiet restaurant where we can try traditional dishes?",
    "Before confirming our plans, we should check whether the tickets can be changed.",
  ],
  es: [
    "Aunque nuestro tren se retrasó, conseguimos llegar antes de que cerrara el museo.",
    "Si hubiera sabido que había una fiesta local, me habría quedado una noche más.",
    "¿Podría recomendarme un restaurante tranquilo donde podamos probar platos tradicionales?",
    "Antes de confirmar nuestros planes, deberíamos comprobar si se pueden cambiar los billetes.",
  ],
  fr: [
    "Bien que notre train ait eu du retard, nous sommes arrivés avant la fermeture du musée.",
    "Si j'avais su qu'il y avait une fête locale, je serais resté une nuit de plus.",
    "Pourriez-vous recommander un restaurant calme où nous pourrions goûter des plats traditionnels ?",
    "Avant de confirmer nos projets, nous devrions vérifier si les billets peuvent être modifiés.",
  ],
  it: [
    "Anche se il nostro treno era in ritardo, siamo riusciti ad arrivare prima della chiusura del museo.",
    "Se avessi saputo della festa locale, sarei rimasto una notte in più.",
    "Potrebbe consigliarmi un ristorante tranquillo dove possiamo assaggiare piatti tradizionali?",
    "Prima di confermare i nostri programmi, dovremmo verificare se i biglietti possono essere cambiati.",
  ],
  pt: [
    "Embora o nosso comboio se tenha atrasado, conseguimos chegar antes de o museu fechar.",
    "Se soubesse que havia uma festa local, teria ficado mais uma noite.",
    "Poderia recomendar um restaurante tranquilo onde possamos provar pratos tradicionais?",
    "Antes de confirmar os nossos planos, deveríamos verificar se os bilhetes podem ser alterados.",
  ],
  de: [
    "Obwohl unser Zug Verspätung hatte, kamen wir noch vor der Schließung des Museums an.",
    "Wenn ich von dem örtlichen Fest gewusst hätte, wäre ich noch eine Nacht geblieben.",
    "Könnten Sie ein ruhiges Restaurant empfehlen, in dem wir traditionelle Gerichte probieren können?",
    "Bevor wir unsere Pläne bestätigen, sollten wir prüfen, ob die Fahrkarten geändert werden können.",
  ],
  ja: [
    "電車が遅れましたが、博物館が閉まる前になんとか到着することができました。",
    "地元のお祭りがあると知っていたら、もう一泊していたと思います。",
    "伝統的な料理を味わえる静かなレストランを紹介していただけませんか。",
    "予定を確定する前に、切符を変更できるかどうか確認したほうがいいでしょう。",
  ],
  zh: [
    "虽然我们的火车晚点了，但我们还是在博物馆关门之前赶到了。",
    "如果我早知道当地有节日庆典，我就会多住一个晚上。",
    "您能推荐一家安静的餐厅，让我们品尝当地的传统菜肴吗？",
    "在确定我们的行程之前，我们应该确认一下车票是否可以更改。",
  ],
  ar: [
    "على الرغم من تأخر قطارنا، تمكنا من الوصول قبل إغلاق المتحف.",
    "لو كنت أعرف بوجود مهرجان محلي، لبقيت ليلة إضافية.",
    "هل يمكنك أن تقترح مطعمًا هادئًا نستطيع فيه تذوق الأطباق التقليدية؟",
    "قبل تأكيد خططنا، ينبغي أن نتحقق مما إذا كان من الممكن تغيير التذاكر.",
  ],
  nl: [
    "Hoewel onze trein vertraging had, kwamen we nog voor de sluiting van het museum aan.",
    "Als ik van het plaatselijke festival had geweten, was ik nog een nacht gebleven.",
    "Kunt u een rustig restaurant aanbevelen waar we traditionele gerechten kunnen proberen?",
    "Voordat we onze plannen bevestigen, moeten we controleren of de kaartjes gewijzigd kunnen worden.",
  ],
  sv: [
    "Trots att vårt tåg var försenat hann vi fram innan museet stängde.",
    "Om jag hade känt till den lokala festivalen skulle jag ha stannat en natt till.",
    "Kan du rekommendera en lugn restaurang där vi kan prova traditionella rätter?",
    "Innan vi bekräftar våra planer bör vi kontrollera om biljetterna går att ändra.",
  ],
};
