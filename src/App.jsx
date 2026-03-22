import { useMemo, useState, useEffect, useCallback, memo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Cursors } from "./components/Cursors";

const RSVP_ENDPOINT = import.meta.env.VITE_RSVP_ENDPOINT || "/api/rsvps";

const content = {
  en: {
    hero: {
      eyebrow: "9-10 May 2026 • Burgundy",
      title: "A weekend to celebrate with us",
      text: "Everything you need for the wedding day, the next-day brunch, RSVP, dinner menu, and practical travel details.",
      primary: "RSVP now",
      secondary: "Plan your trip"
    },
    welcome: {
      kicker: "Wedding day",
      title: "Saturday, 9 May 2026",
      text: "We begin in Auxerre for the civil ceremony and continue at Domaine du Roncemay for an afternoon and evening in Burgundy."
    },
    schedule: {
      kicker: "Day plan",
      title: "Timeline for 9 May",
      note: "Times are indicative and may shift slightly on the day."
    },
    nextDay: {
      kicker: "Next day",
      title: "Sunday, 10 May 2026",
      note: "A relaxed Sunday plan at Domaine du Roncemay, with transfers back in the afternoon."
    },
    menu: {
      kicker: "Dinner at Roncemay",
      title: "Our wedding dinner menu",
      note: "We picked one starter and one dessert from the current Roncemay menu for everyone, and each guest can choose a main course below.",
      shared: "Shared for everyone",
      choice: "Your choice",
      starterTitle: "Starter",
      starterDish: "Farm egg cocotte with Soumaintrain cheese, poultry confit, and sourdough bread",
      mainTitle: "Main course",
      dessertTitle: "Dessert",
      dessertDish:
        "Gianduja profiterole with ice cream, cocoa craquelin, gianduja sauce, and toasted hazelnuts",
      dietaryTitle: "Dietary note",
      dietaryText:
        "Vegetarian and vegan alternatives will be prepared on request. Please mention any dietary restrictions or allergies in the RSVP form.",
      selectedLabel: "Selected main",
      selectionHint: "Tap a main course card to prefill your RSVP choice."
    },
    rsvp: {
      kicker: "RSVP",
      title: "Reply with your menu choice",
      note: "Please reply by 15 April 2026.",
      fields: {
        name: "Full name",
        email: "Email",
        phone: "Phone",
        attendance: "Will you attend?",
        events: "Which moments will you join?",
        menu: "Main course choice",
        transfer: "Would you like transfer help?",
        dietary: "Dietary restrictions or allergies",
        notes: "Anything else we should know?"
      },
      options: {
        choose: "Please choose",
        yes: "Yes, with pleasure",
        no: "Sadly, no",
        weddingAndBrunch: "Wedding day + brunch",
        weddingOnly: "Wedding day only",
        brunchOnly: "Brunch only",
        beef: "Beef",
        fish: "Fish",
        guineaFowl: "Guinea fowl",
        pork: "Pork",
        vegetarian: "Vegetarian",
        vegan: "Vegan",
        transferYes: "Yes",
        transferNo: "No"
      },
      submit: "Send RSVP",
      successRemote: "Thank you. Your RSVP has been sent.",
      successLocal:
        "RSVP saved in this browser for now. Add a real RSVP endpoint in the app to receive submissions online.",
      error: "Something went wrong while sending the RSVP. Please try again."
    },
    logistics: {
      kicker: "Logistics",
      title: "Travel and stay details",
      note: "Browse by topic below. Open any question to read the details, and still double-check live transport schedules closer to the date."
    },
    scheduleItems: [
      {
        time: "13:30",
        title: "Guests gather at Mairie d'Auxerre",
        description: "Please arrive from 13:30 so we can all be ready for the ceremony.",
        location: "Mairie d'Auxerre",
        url: "https://maps.app.goo.gl/wDfwtcaomWeJhkoi6"
      },
      {
        time: "14:00",
        title: "Civil ceremony at Mairie d'Auxerre",
        description: "The official ceremony begins at 14:00.",
        location: "Mairie d'Auxerre",
        url: "https://maps.app.goo.gl/wDfwtcaomWeJhkoi6"
      },
      {
        time: "After the ceremony",
        title: "Sparkling toast",
        description: "A celebratory glass together just after the ceremony.",
        location: "Mairie d'Auxerre",
        url: "https://maps.app.goo.gl/wDfwtcaomWeJhkoi6"
      },
      {
        time: "15:15-15:45",
        title: "Transfer to Domaine du Roncemay",
        description: "Planned transfer window from Auxerre to the reception venue.",
        location: "Place de l'Arquebuse",
        url: "https://maps.app.goo.gl/kAozCZSt48x1raUN7"
      },
      {
        time: "16:00",
        title: "Afternoon tea on the bistro terrace",
        description: "A relaxed afternoon pause on the terrace.",
        location: "Domaine du Roncemay",
        url: "https://maps.app.goo.gl/VFZitv9ZWvbp24r16"
      },
      {
        time: "18:00",
        title: "Apero",
        description: "Drinks, conversation, and golden hour.",
        location: "Domaine du Roncemay",
        url: "https://maps.app.goo.gl/VFZitv9ZWvbp24r16"
      },
      {
        time: "19:00-00:00",
        title: "Dinner and evening celebration",
        description: "Dinner begins at 19:00 and the evening continues until midnight.",
        location: "Domaine du Roncemay",
        url: "https://maps.app.goo.gl/VFZitv9ZWvbp24r16"
      }
    ],
    nextDayItems: [
      {
        time: "09:30",
        title: "Transfer from Auxerre",
        description: "Departure from the same meeting point in Auxerre for guests returning to Domaine du Roncemay.",
        location: "Place de l'Arquebuse",
        url: "https://maps.app.goo.gl/kAozCZSt48x1raUN7"
      },
      {
        time: "10:00-12:00",
        title: "Brunch at Domaine du Roncemay",
        description: "A relaxed brunch together at the Domaine.",
        location: "Domaine du Roncemay",
        url: "https://maps.app.goo.gl/VFZitv9ZWvbp24r16"
      },
      {
        time: "12:00-14:00",
        title: "Golf introduction session",
        description:
          "If you would rather skip golf, you can enjoy a bike ride, petanque, a walk around the domain, or simply chat with the other guests.",
        location: "Domaine du Roncemay",
        url: "https://maps.app.goo.gl/VFZitv9ZWvbp24r16"
      },
      {
        time: "16:00",
        title: "Transfer back to Auxerre",
        description: "Return transfer for guests heading back to Auxerre.",
        location: "Domaine du Roncemay",
        url: "https://maps.app.goo.gl/VFZitv9ZWvbp24r16"
      },
      {
        time: "16:00",
        title: "Transfer to Paris",
        description: "Direct transfer departure for guests continuing on to Paris.",
        location: "Domaine du Roncemay",
        url: "https://maps.app.goo.gl/VFZitv9ZWvbp24r16"
      }
    ],
    menuOptions: [
      ["beef", "Beef", "Beef cut with herb crust, short jus, and oven-roasted potatoes"],
      ["fish", "Fish", "Market fish with bouillabaisse jus, aioli espuma, and fennel variations"],
      ["guinea-fowl", "Guinea fowl", "Roasted guinea fowl with chestnut jus, braised red cabbage, and parsnip puree"],
      ["pork", "Pork", "Slow-cooked farm pork in its jus with Yonne lentils"],
      ["vegetarian", "Vegetarian", "A seasonal vegetarian plate will be prepared on request."],
      ["vegan", "Vegan", "A seasonal vegan plate will be prepared on request."]
    ],
    logisticsSections: [
      {
        title: "Transportation",
        items: [
          {
            title: "How to get to Auxerre",
            text: "Auxerre is easiest to reach by train from Paris Bercy Bourgogne. Direct trips commonly run in about 1h37 to 1h39.",
            links: [["Paris > Auxerre trains", "https://www.sncf-connect.com/en-en/train/timetables/paris/auxerre"]]
          },
          {
            title: "From Auxerre-Saint-Gervais station to the Mairie",
            text: "The station is a short taxi ride from the town centre. On foot, allow roughly 20 to 25 minutes to Place de l'Hotel de Ville.",
            links: [["Tourist office", "https://www.ot-auxerre.fr/espace-pro/contacts/"]]
          },
          {
            title: "Reception venue: Domaine du Roncemay",
            text: "The reception takes place at Domaine du Roncemay in Chassy. Auxerre is about 22 km away, roughly 25 minutes by road.",
            links: [
              ["Venue information", "https://roncemay.com/en/informations-pratiques.html"],
              ["Venue website", "https://roncemay.com/fr/"]
            ]
          },
          {
            title: "Transfer on Saturday morning: Paris to Auxerre",
            text: "The easiest plan is usually an early TER from Paris Bercy Bourgogne to Auxerre-Saint-Gervais, arriving no later than early afternoon.",
            links: [["Check SNCF timetable", "https://www.sncf-connect.com/en-en/train/timetables/paris/auxerre"]]
          },
          {
            title: "Transfer on Sunday afternoon: Auxerre to Paris",
            text: "Regular return departures typically run back to Paris in about 1h44. An afternoon train is likely the most comfortable option.",
            links: [["Auxerre > Paris trains", "https://www.sncf-connect.com/en-en/train/timetables/auxerre/paris"]]
          }
        ]
      },
      {
        title: "Accommodation",
        items: [
          {
            title: "Where to stay in Auxerre",
            text: "A few central options include Hotel Le Maxime, Hotel Normandie, and Ibis Budget Auxerre Centre. Booking early is strongly recommended.",
            links: [
              ["Hotel Le Maxime", "https://www.ot-auxerre.fr/offres/hotel-le-maxime-bw-signature-collection-auxerre-fr-2563381/"],
              ["Hotel Normandie", "https://www.ot-auxerre.fr/offres/the-originals-hotel-normandie-auxerre-auxerre-fr-2563385/"],
              ["2026 tourism guide", "https://www.ot-auxerre.fr/app/uploads/auxerrois/2026/03/OT_Guide-Touristique-2026-web.pdf"]
            ]
          }
        ]
      },
      {
        title: "Auxerre",
        items: [
          {
            title: "Why we are here",
            text: "Auxerre is where we begin the wedding weekend with the civil ceremony, and it gives everyone a lovely Burgundy stop before heading to Domaine du Roncemay.",
            links: [["Auxerre tourism", "https://www.ot-auxerre.fr/"]]
          },
          {
            title: "Where to go for a walk",
            text: "A gentle walk through the old town, along the Yonne river quays, and around the Cathedral district is a lovely way to discover Auxerre.",
            links: [["Things to do in Auxerre", "https://www.ot-auxerre.fr/decouvrir/"]]
          },
          {
            title: "What to check",
            text: "If you have a little extra time, the old town centre, Saint-Etienne Cathedral, the clock tower area, and the riverfront are all worth seeing.",
            links: [["Explore Auxerre", "https://www.ot-auxerre.fr/decouvrir/"]]
          },
          {
            title: "Where to eat",
            text: "Good local picks include Le Cadet Roussel, Le Saint-Pelerin, and L'Asperule for guests arriving early.",
            links: [
              ["Le Cadet Roussel", "https://www.ot-auxerre.fr/offres/le-cadet-roussel-auxerre-fr-5336590/"],
              ["Le Saint-Pelerin", "https://www.ot-auxerre.fr/offres/le-saint-pelerin-auxerre-fr-2563341/"],
              ["L'Asperule", "https://www.ot-auxerre.fr/offres/lasperule-auxerre-fr-2563250/"]
            ]
          }
        ]
      }
    ]
  },
  fr: {
    hero: {
      eyebrow: "9-10 mai 2026 • Bourgogne",
      title: "Un week-end pour celebrer avec nous",
      text: "Toutes les informations utiles pour le mariage, le brunch du lendemain, le RSVP, le diner et l'organisation pratique du voyage.",
      primary: "Confirmer sa venue",
      secondary: "Organiser son trajet"
    },
    welcome: {
      kicker: "Jour du mariage",
      title: "Samedi 9 mai 2026",
      text: "Nous commencerons a Auxerre pour la ceremonie civile, puis nous poursuivrons au Domaine du Roncemay pour l'apres-midi et la soiree."
    },
    schedule: {
      kicker: "Programme",
      title: "Deroule du 9 mai",
      note: "Les horaires sont indicatifs et pourront legèrement evoluer le jour J."
    },
    nextDay: {
      kicker: "Le lendemain",
      title: "Dimanche 10 mai 2026",
      note: "Un programme tranquille au Domaine du Roncemay, avec les transferts de retour dans l'apres-midi."
    },
    menu: {
      kicker: "Diner au Roncemay",
      title: "Le menu de notre diner",
      note: "Nous avons choisi une entree et un dessert dans la carte actuelle du Roncemay pour tout le monde, et chaque invite peut selectionner son plat principal ci-dessous.",
      shared: "Pour tout le monde",
      choice: "A choisir",
      starterTitle: "Entree",
      starterDish: "Oeuf cocotte fermier au soumaintrain, confit de volaille et pain au levain",
      mainTitle: "Plat principal",
      dessertTitle: "Dessert",
      dessertDish:
        "La profiterole au gianduja, creme glacee, craquelin cacao et sauce gianduja avec quelques noisettes torrefiees",
      dietaryTitle: "Note alimentaire",
      dietaryText:
        "Des alternatives vegetariennes et vegan pourront etre preparees sur demande. Merci d'indiquer toute allergie ou restriction alimentaire dans le formulaire RSVP.",
      selectedLabel: "Plat selectionne",
      selectionHint: "Touchez une carte plat pour preremplir votre choix dans le RSVP."
    },
    rsvp: {
      kicker: "RSVP",
      title: "Confirmez votre venue et votre menu",
      note: "Merci de repondre avant le 15 avril 2026.",
      fields: {
        name: "Nom complet",
        email: "Email",
        phone: "Telephone",
        attendance: "Serez-vous present(e) ?",
        events: "A quels moments serez-vous parmi nous ?",
        menu: "Choix du plat",
        transfer: "Avez-vous besoin d'aide pour les transferts ?",
        dietary: "Allergies ou regime alimentaire",
        notes: "Autre information utile"
      },
      options: {
        choose: "Merci de choisir",
        yes: "Oui, avec joie",
        no: "Malheureusement non",
        weddingAndBrunch: "Mariage + brunch",
        weddingOnly: "Mariage uniquement",
        brunchOnly: "Brunch uniquement",
        beef: "Boeuf",
        fish: "Poisson",
        guineaFowl: "Pintade",
        pork: "Porc",
        vegetarian: "Vegetarien",
        vegan: "Vegan",
        transferYes: "Oui",
        transferNo: "Non"
      },
      submit: "Envoyer le RSVP",
      successRemote: "Merci. Votre reponse a bien ete envoyee.",
      successLocal:
        "Le RSVP est enregistre dans ce navigateur pour le moment. Ajoutez un vrai endpoint dans l'app pour recevoir les reponses en ligne.",
      error: "Une erreur est survenue pendant l'envoi. Merci de reessayer."
    },
    logistics: {
      kicker: "Logistique",
      title: "Informations de trajet et de sejour",
      note: "Parcourez les informations par theme ci-dessous. Ouvrez une question pour lire le detail, et reverifiez les horaires en temps reel plus pres de la date."
    },
    scheduleItems: [
      {
        time: "13:30",
        title: "Accueil des invites a la Mairie d'Auxerre",
        description: "Merci d'arriver a partir de 13:30 afin que tout le monde soit installe avant la ceremonie.",
        location: "Mairie d'Auxerre",
        url: "https://maps.app.goo.gl/wDfwtcaomWeJhkoi6"
      },
      {
        time: "14:00",
        title: "Ceremonie civile a la Mairie d'Auxerre",
        description: "La ceremonie officielle commence a 14:00.",
        location: "Mairie d'Auxerre",
        url: "https://maps.app.goo.gl/wDfwtcaomWeJhkoi6"
      },
      {
        time: "Apres la ceremonie",
        title: "Coupe de cremant",
        description: "Un verre pour celebrer ensemble juste apres la ceremonie.",
        location: "Mairie d'Auxerre",
        url: "https://maps.app.goo.gl/wDfwtcaomWeJhkoi6"
      },
      {
        time: "15:15-15:45",
        title: "Transfert vers le Domaine du Roncemay",
        description: "Plage de transfert prevue entre Auxerre et le lieu de reception.",
        location: "Place de l'Arquebuse",
        url: "https://maps.app.goo.gl/kAozCZSt48x1raUN7"
      },
      {
        time: "16:00",
        title: "Gouter sur la terrasse du bistrot",
        description: "Une pause gourmande et detendue dans l'apres-midi.",
        location: "Domaine du Roncemay",
        url: "https://maps.app.goo.gl/VFZitv9ZWvbp24r16"
      },
      {
        time: "18:00",
        title: "Apero",
        description: "Verres, discussions et jolie lumiere de fin de journee.",
        location: "Domaine du Roncemay",
        url: "https://maps.app.goo.gl/VFZitv9ZWvbp24r16"
      },
      {
        time: "19:00-00:00",
        title: "Diner et soiree",
        description: "Le diner commence a 19:00 et la fete se poursuit jusqu'a minuit.",
        location: "Domaine du Roncemay",
        url: "https://maps.app.goo.gl/VFZitv9ZWvbp24r16"
      }
    ],
    nextDayItems: [
      {
        time: "09:30",
        title: "Transfert depuis Auxerre",
        description: "Depart depuis le meme point de rendez-vous a Auxerre pour les invites qui rejoignent le Domaine du Roncemay.",
        location: "Place de l'Arquebuse",
        url: "https://maps.app.goo.gl/kAozCZSt48x1raUN7"
      },
      {
        time: "10:00-12:00",
        title: "Brunch au Domaine du Roncemay",
        description: "Un brunch detendu tous ensemble au Domaine.",
        location: "Domaine du Roncemay",
        url: "https://maps.app.goo.gl/VFZitv9ZWvbp24r16"
      },
      {
        time: "12:00-14:00",
        title: "Initiation au golf",
        description:
          "Si vous preferez ne pas participer, vous pourrez profiter d'une balade a velo, d'une partie de petanque, d'une promenade dans le domaine ou simplement discuter avec les autres invites.",
        location: "Domaine du Roncemay",
        url: "https://maps.app.goo.gl/VFZitv9ZWvbp24r16"
      },
      {
        time: "16:00",
        title: "Transfert retour vers Auxerre",
        description: "Transfert de retour pour les invites qui repartent vers Auxerre.",
        location: "Domaine du Roncemay",
        url: "https://maps.app.goo.gl/VFZitv9ZWvbp24r16"
      },
      {
        time: "16:00",
        title: "Transfert vers Paris",
        description: "Depart du transfert direct pour les invites qui poursuivent ensuite vers Paris.",
        location: "Domaine du Roncemay",
        url: "https://maps.app.goo.gl/VFZitv9ZWvbp24r16"
      }
    ],
    menuOptions: [
      ["beef", "Boeuf", "Piece de boeuf craquelin fleurs de gazette, jus court, pommes de terre au four"],
      ["fish", "Poisson", "Poisson du marche, jus bouillabaisse, espuma aioli et declinaison autour du fenouil"],
      ["guinea-fowl", "Pintade", "Pintade et cuisse rotie a plat, jus aux eclats de chataignes, choux rouges braises, puree de panais"],
      ["pork", "Porc", "Carre de porc fermier cuisson basse temperature dans son jus, lentilles de l'Yonne"],
      ["vegetarian", "Vegetarien", "Une assiette vegetarienne de saison pourra etre preparee sur demande."],
      ["vegan", "Vegan", "Une assiette vegan de saison pourra etre preparee sur demande."]
    ],
    logisticsSections: [
      {
        title: "Transport",
        items: [
          {
            title: "Comment venir a Auxerre",
            text: "Auxerre est tres facilement accessible en train depuis Paris Bercy Bourgogne. Les trajets directs durent souvent autour de 1 h 37 a 1 h 39.",
            links: [["Trains Paris > Auxerre", "https://www.sncf-connect.com/fr-fr/train/horaires/paris/auxerre"]]
          },
          {
            title: "De la gare d'Auxerre-Saint-Gervais a la Mairie",
            text: "La gare se trouve a une courte distance en taxi du centre-ville. A pied, comptez environ 20 a 25 minutes jusqu'a la Place de l'Hotel de Ville.",
            links: [["Office de tourisme", "https://www.ot-auxerre.fr/espace-pro/contacts/"]]
          },
          {
            title: "Lieu de reception: Domaine du Roncemay",
            text: "La reception aura lieu au Domaine du Roncemay a Chassy. Auxerre se trouve a environ 22 km, soit environ 25 minutes de route.",
            links: [
              ["Infos pratiques du Domaine", "https://roncemay.com/fr/informations-pratiques.html"],
              ["Site du Domaine", "https://roncemay.com/fr/"]
            ]
          },
          {
            title: "Transfert du samedi matin: Paris vers Auxerre",
            text: "Le plus simple sera generalement de prendre un TER tot le matin depuis Paris Bercy Bourgogne vers Auxerre-Saint-Gervais.",
            links: [["Verifier les horaires SNCF", "https://www.sncf-connect.com/fr-fr/train/horaires/paris/auxerre"]]
          },
          {
            title: "Transfert du dimanche apres-midi: Auxerre vers Paris",
            text: "Les retours vers Paris durent souvent autour de 1 h 44. Un train l'apres-midi sera probablement le plus confortable.",
            links: [["Trains Auxerre > Paris", "https://www.sncf-connect.com/fr-ch/train/trajet/auxerre/paris"]]
          }
        ]
      },
      {
        title: "Hebergement",
        items: [
          {
            title: "Ou loger a Auxerre",
            text: "Quelques options centrales incluent Hotel Le Maxime, Hotel Normandie et Ibis Budget Auxerre Centre. Nous recommandons de reserver tot.",
            links: [
              ["Hotel Le Maxime", "https://www.ot-auxerre.fr/offres/hotel-le-maxime-bw-signature-collection-auxerre-fr-2563381/"],
              ["Hotel Normandie", "https://www.ot-auxerre.fr/offres/the-originals-hotel-normandie-auxerre-auxerre-fr-2563385/"],
              ["Guide touristique 2026", "https://www.ot-auxerre.fr/app/uploads/auxerrois/2026/03/OT_Guide-Touristique-2026-web.pdf"]
            ]
          }
        ]
      },
      {
        title: "Auxerre",
        items: [
          {
            title: "Pourquoi sommes-nous ici ?",
            text: "Auxerre est le point de depart de notre week-end de mariage avec la ceremonie civile, et une tres belle etape bourguignonne avant de rejoindre le Domaine du Roncemay.",
            links: [["Office de tourisme d'Auxerre", "https://www.ot-auxerre.fr/"]]
          },
          {
            title: "Ou aller se promener ?",
            text: "Une promenade dans le centre ancien, le long des quais de l'Yonne et autour du quartier de la cathedrale permet de profiter tres facilement du charme d'Auxerre.",
            links: [["Decouvrir Auxerre", "https://www.ot-auxerre.fr/decouvrir/"]]
          },
          {
            title: "Que voir ?",
            text: "Si vous avez un peu de temps, le centre historique, la cathedrale Saint-Etienne, le quartier de la tour de l'Horloge et les bords de l'Yonne valent le detour.",
            links: [["Visiter Auxerre", "https://www.ot-auxerre.fr/decouvrir/"]]
          },
          {
            title: "Ou manger ?",
            text: "Pour les invites qui arrivent en avance, Le Cadet Roussel, Le Saint-Pelerin et L'Asperule sont de bonnes pistes.",
            links: [
              ["Le Cadet Roussel", "https://www.ot-auxerre.fr/offres/le-cadet-roussel-auxerre-fr-5336590/"],
              ["Le Saint-Pelerin", "https://www.ot-auxerre.fr/offres/le-saint-pelerin-auxerre-fr-2563341/"],
              ["L'Asperule", "https://www.ot-auxerre.fr/offres/lasperule-auxerre-fr-2563250/"]
            ]
          }
        ]
      }
    ]
  }
};

const fieldClass =
  "w-full rounded-2xl border border-[rgba(93,52,38,0.16)] bg-[#fffdf9] px-4 py-3 text-sm text-[#2a211c] outline-none transition focus:border-[rgba(93,52,38,0.3)] focus:ring-2 focus:ring-[rgba(200,158,91,0.45)]";

function App() {
  const [lang, setLang] = useState("en");
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [attendance, setAttendance] = useState("");
  const [selectedMain, setSelectedMain] = useState("");

  const t = content[lang];
  const menuRequired = attendance !== "no";

  const menuSelectOptions = useMemo(
    () =>
      t.menuOptions.map(([value, label]) => [
        value,
        label
      ]),
    [t]
  );

  const handleSubmit = useCallback(async function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());
    payload.language = lang;
    payload.submittedAt = new Date().toISOString();

    setSubmitting(true);
    setStatus("");
    try {
      if (RSVP_ENDPOINT) {
        const response = await fetch(RSVP_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error("Submission failed");
        }

        setStatus(t.rsvp.successRemote);
      } else {
        setStatus(t.rsvp.successLocal);
      }

      form.reset();
      setAttendance("");
      setSelectedMain("");
    } catch {
      setStatus(t.rsvp.error);
    } finally {
      setSubmitting(false);
    }
  }, [lang, t]);

  return (
    <div className="relative mx-auto my-4 w-[min(calc(100%-20px),1180px)] pb-12 sm:w-[min(calc(100%-32px),1180px)]">
      <header className="relative overflow-hidden rounded-[28px] border border-white/70 bg-[rgba(255,250,243,0.78)] p-5 shadow-[0_24px_80px_rgba(72,40,23,0.12)] backdrop-blur-xl">
        <div className="absolute -right-[10%] -bottom-[20%] h-[340px] w-[340px] rounded-full bg-radial from-[rgba(200,158,91,0.45)] to-transparent" />
        <div className="relative z-10 flex items-center justify-between gap-4">
          <div className="text-xs font-bold uppercase tracking-[0.14em] text-[#5d3426]">Wedding Weekend</div>
          <div className="inline-flex gap-2 rounded-full border border-[rgba(71,46,31,0.12)] bg-[rgba(255,250,243,0.7)] p-1.5">
            {["en", "fr"].map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setLang(code)}
                className={`rounded-full px-4 py-2.5 text-sm font-medium transition ${
                  lang === code ? "bg-[#5d3426] text-[#fffaf3]" : "text-[#6a5a51]"
                }`}
              >
                {code.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="relative z-10 grid items-center gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,400px)] lg:gap-10">
          <div className="max-w-[760px] py-7 md:py-10 lg:py-12">
            <p className="text-xs uppercase tracking-[0.14em] text-[#5d3426]">{t.hero.eyebrow}</p>
            <h1 className="mt-3 font-serif text-[clamp(2.6rem,7vw,5.5rem)] leading-[0.95] text-[#2a211c]">
              {t.hero.title}
            </h1>
            <p className="mt-4 max-w-[56ch] text-base leading-7 text-[#6a5a51]">{t.hero.text}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <a className="rounded-full bg-gradient-to-br from-[#5d3426] to-[#8a5a44] px-6 py-3.5 font-bold text-white" href="#rsvp">
                {t.hero.primary}
              </a>
              <a
                className="rounded-full border border-[rgba(71,46,31,0.12)] bg-[rgba(255,250,243,0.9)] px-6 py-3.5 font-bold text-[#5d3426]"
                href="#logistics"
              >
                {t.hero.secondary}
              </a>
            </div>
          </div>
          <div className="flex justify-center lg:justify-end">
            <div className="relative w-full max-w-[500px] pb-8 pl-6 pr-2 pt-6 sm:pl-10 sm:pr-6">
              <div className="pointer-events-none absolute top-6 left-0 h-[120px] w-[120px] rounded-full bg-radial from-[rgba(200,158,91,0.28)] to-transparent" />
              <figure className="relative z-10 ml-auto w-[78%] rounded-[30px] border border-white/80 bg-[rgba(255,250,243,0.72)] p-3.5 shadow-[0_32px_72px_rgba(72,40,23,0.18)]">
                <img
                  src="/us.jpeg"
                  alt="The couple smiling together with their corgi."
                  className="block h-auto w-full rounded-[22px] object-contain"
                />
              </figure>
              <figure className="absolute bottom-0 left-0 z-20 w-[46%] rounded-[28px] border border-white/80 bg-[rgba(255,250,243,0.82)] p-3 shadow-[0_28px_60px_rgba(72,40,23,0.2)]">
                <img
                  src="/us2.jpeg"
                  alt="A second portrait of the couple together."
                  className="block aspect-[3/4] w-full rounded-[20px] object-cover object-center"
                />
              </figure>
            </div>
          </div>
        </div>
      </header>

      <main className="space-y-3 pt-3">
        <SectionCard>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-[#5d3426]">{t.welcome.kicker}</p>
              <h2 className="font-serif text-[clamp(2.2rem,4vw,3.8rem)] leading-[0.95]">{t.welcome.title}</h2>
            </div>
            <p className="max-w-[52ch] text-base leading-7 text-[#6a5a51]">{t.welcome.text}</p>
          </div>
        </SectionCard>

        <SectionCard>
          <SectionHeading kicker={t.schedule.kicker} title={t.schedule.title} note={t.schedule.note} />
          <div className="grid gap-4">
            {t.scheduleItems.map((item) => (
              <article
                key={`${item.time}-${item.title}`}
                className="relative grid gap-3 overflow-hidden rounded-2xl border border-[rgba(71,46,31,0.12)] bg-[#fffaf2] p-4 pl-5 md:grid-cols-[minmax(110px,150px)_minmax(0,1fr)_auto] md:items-start"
              >
                <div className="absolute top-0 left-0 bottom-0 w-[3px] rounded-r-sm bg-gradient-to-b from-[#c89e5b] to-[#8a5a44] opacity-50" />
                <div className="font-bold text-[#5d3426]">{item.time}</div>
                <div>
                  <h3 className="mb-1 font-serif text-[clamp(1.2rem,2vw,1.6rem)] leading-[1.05]">{item.title}</h3>
                  <p className="m-0 text-sm leading-6 text-[#6a5a51]">{item.description}</p>
                </div>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex self-start rounded-full border border-[rgba(138,90,68,0.18)] bg-white/70 px-4 py-2 text-sm font-semibold text-[#8a5a44] hover:border-[rgba(138,90,68,0.35)] hover:underline"
                >
                  {item.location}
                </a>
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard>
          <SectionHeading kicker={t.nextDay.kicker} title={t.nextDay.title} note={t.nextDay.note} />
          <div className="grid gap-4">
            {t.nextDayItems.map((item) => (
              <article
                key={`${item.time}-${item.title}`}
                className="relative grid gap-3 overflow-hidden rounded-2xl border border-[rgba(71,46,31,0.12)] bg-[#fffaf2] p-4 pl-5 md:grid-cols-[minmax(110px,150px)_minmax(0,1fr)_auto] md:items-start"
              >
                <div className="absolute top-0 left-0 bottom-0 w-[3px] rounded-r-sm bg-gradient-to-b from-[#c89e5b] to-[#8a5a44] opacity-50" />
                <div className="font-bold text-[#5d3426]">{item.time}</div>
                <div>
                  <h3 className="mb-1 font-serif text-[clamp(1.2rem,2vw,1.6rem)] leading-[1.05]">{item.title}</h3>
                  <p className="m-0 text-sm leading-6 text-[#6a5a51]">{item.description}</p>
                </div>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex self-start rounded-full border border-[rgba(138,90,68,0.18)] bg-white/70 px-4 py-2 text-sm font-semibold text-[#8a5a44] hover:border-[rgba(138,90,68,0.35)] hover:underline"
                >
                  {item.location}
                </a>
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard id="menu">
          <SectionHeading kicker={t.menu.kicker} title={t.menu.title} note={t.menu.note} />
          <div className="grid gap-4">
            <MenuCard label={t.menu.shared} title={t.menu.starterTitle} highlight>
              {t.menu.starterDish}
            </MenuCard>
            <MenuCard label={t.menu.choice} title={t.menu.mainTitle}>
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[rgba(71,46,31,0.08)] bg-[rgba(248,242,233,0.65)] px-4 py-3">
                <p className="text-sm text-[#6a5a51]">{t.menu.selectionHint}</p>
                <div className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#5d3426] shadow-sm">
                  {t.menu.selectedLabel}: {selectedMain ? menuSelectOptions.find(([value]) => value === selectedMain)?.[1] : t.rsvp.options.choose}
                </div>
              </div>
              <div className="grid gap-3">
                {t.menuOptions.map(([value, title, description]) => {
                  const active = value === selectedMain;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setSelectedMain(value)}
                      className={`grid gap-2 rounded-[22px] border px-5 py-4 text-left transition ${
                        active
                          ? "border-[#8a5a44] bg-[linear-gradient(180deg,#fffaf2_0%,#fbf3e4_100%)] shadow-[0_14px_34px_rgba(72,40,23,0.10)]"
                          : "border-[rgba(71,46,31,0.12)] bg-white/80 hover:border-[rgba(138,90,68,0.35)]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <strong className="block text-xl text-[#2a211c]">{title}</strong>
                          <p className="mt-2 text-base leading-7 text-[#6a5a51]">{description}</p>
                        </div>
                        <span
                          className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                            active ? "border-[#8a5a44] bg-[#8a5a44] text-white" : "border-[rgba(71,46,31,0.18)] bg-white"
                          }`}
                        >
                          {active ? "✓" : ""}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </MenuCard>
            <MenuCard label={t.menu.shared} title={t.menu.dessertTitle} highlight>
              {t.menu.dessertDish}
            </MenuCard>
            <div className="rounded-2xl border border-[rgba(71,46,31,0.12)] bg-[#fffaf2] p-5">
              <strong className="text-[#2a211c]">{t.menu.dietaryTitle}</strong>
              <p className="mt-2 text-base leading-7 text-[#6a5a51]">{t.menu.dietaryText}</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard id="rsvp">
          <SectionHeading kicker={t.rsvp.kicker} title={t.rsvp.title} note={t.rsvp.note} />
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t.rsvp.fields.name}>
                <input className={fieldClass} name="name" required />
              </Field>
              <Field label={t.rsvp.fields.email}>
                <input className={fieldClass} name="email" type="email" required />
              </Field>
              <Field label={t.rsvp.fields.phone}>
                <input className={fieldClass} name="phone" type="tel" />
              </Field>
              <Field label={t.rsvp.fields.attendance}>
                <select
                  className={fieldClass}
                  name="attendance"
                  required
                  value={attendance}
                  onChange={(event) => setAttendance(event.target.value)}
                >
                  <option value="">{t.rsvp.options.choose}</option>
                  <option value="yes">{t.rsvp.options.yes}</option>
                  <option value="no">{t.rsvp.options.no}</option>
                </select>
              </Field>
              <Field label={t.rsvp.fields.events}>
                <select className={fieldClass} name="events" required={menuRequired} disabled={!menuRequired}>
                  <option value="">{t.rsvp.options.choose}</option>
                  <option value="wedding-and-brunch">{t.rsvp.options.weddingAndBrunch}</option>
                  <option value="wedding-only">{t.rsvp.options.weddingOnly}</option>
                  <option value="brunch-only">{t.rsvp.options.brunchOnly}</option>
                </select>
              </Field>
              <Field label={t.rsvp.fields.menu}>
                <select
                  className={fieldClass}
                  name="menu"
                  required={menuRequired}
                  disabled={!menuRequired}
                  value={selectedMain}
                  onChange={(event) => setSelectedMain(event.target.value)}
                >
                  <option value="">{t.rsvp.options.choose}</option>
                  {menuSelectOptions.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t.rsvp.fields.transfer}>
                <select className={fieldClass} name="transfer">
                  <option value="">{t.rsvp.options.choose}</option>
                  <option value="yes">{t.rsvp.options.transferYes}</option>
                  <option value="no">{t.rsvp.options.transferNo}</option>
                </select>
              </Field>
            </div>

            <Field label={t.rsvp.fields.dietary}>
              <textarea className={fieldClass} name="dietary" rows="3" />
            </Field>
            <Field label={t.rsvp.fields.notes}>
              <textarea className={fieldClass} name="notes" rows="4" />
            </Field>

            <div className="flex flex-col gap-3 pt-2 md:flex-row md:items-center md:justify-between">
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-full bg-gradient-to-br from-[#5d3426] to-[#8a5a44] px-6 py-3.5 font-bold text-white transition-opacity disabled:opacity-60 md:w-auto"
              >
                {submitting ? "…" : t.rsvp.submit}
              </button>
              <p className="min-h-6 text-sm leading-6 text-[#6a5a51]">{status}</p>
            </div>
          </form>
        </SectionCard>

        <LogisticsSection t={t} />
      </main>

      <footer className="mt-8 py-8 text-center">
        <p className="font-serif text-[clamp(1.4rem,3vw,2rem)] leading-none text-[#8a5a44]">
          Lucas &amp; Ekaterina
        </p>
        <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[#6a5a51]">9–10 May 2026 · Burgundy</p>
      </footer>

      <StickyBar t={t} />
      <Cursors />
    </div>
  );
}

function SectionCard({ children, id }) {
  return (
    <section
      id={id}
      className="rounded-[20px] border border-white/70 bg-[rgba(255,250,243,0.78)] p-4 shadow-[0_24px_80px_rgba(72,40,23,0.12)] backdrop-blur-xl md:p-6"
    >
      {children}
    </section>
  );
}

function SectionHeading({ kicker, title, note }) {
  return (
    <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.14em] text-[#5d3426]">{kicker}</p>
        <h2 className="font-serif text-[clamp(1.8rem,3.5vw,3rem)] leading-[0.95]">{title}</h2>
      </div>
      {note ? <p className="max-w-[48ch] text-sm leading-6 text-[#6a5a51]">{note}</p> : null}
    </div>
  );
}

function InfoCard({ title, text }) {
  return (
    <article className="rounded-2xl border border-[rgba(71,46,31,0.12)] bg-[#fffaf2] p-6">
      <h3 className="mb-2 font-serif text-[clamp(1.5rem,2.6vw,2rem)] leading-[0.95]">{title}</h3>
      <p className="text-base leading-7 text-[#6a5a51]">{text}</p>
    </article>
  );
}

function MenuCard({ label, title, highlight = false, className = "", children }) {
  return (
    <div
      className={`rounded-2xl border border-[rgba(71,46,31,0.12)] p-5 ${
        highlight ? "bg-gradient-to-b from-[#fffcf6] to-[#fbf3e4]" : "bg-[#fffaf2]"
      } ${className}`}
    >
      <p className="mb-3 text-xs uppercase tracking-[0.12em] text-[#5d3426]">{label}</p>
      <h3 className="mb-2 font-serif text-[clamp(1.5rem,2.6vw,2rem)] leading-[0.95]">{title}</h3>
      <div className="text-base leading-7 text-[#6a5a51]">{children}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="grid gap-2 text-sm text-[#6a5a51]">
      <span>{label}</span>
      {children}
    </label>
  );
}

const LogisticsSection = memo(function LogisticsSection({ t }) {
  const [openQuestion, setOpenQuestion] = useState("0-0");

  return (
    <SectionCard id="logistics">
      <SectionHeading kicker={t.logistics.kicker} title={t.logistics.title} note={t.logistics.note} />
      <div className="grid gap-6">
        {t.logisticsSections.map((section, sectionIndex) => (
          <div key={section.title} className="grid gap-3">
            <h3 className="px-1 font-serif text-[clamp(1.6rem,2.8vw,2.3rem)] leading-[0.95] text-[#2a211c]">
              {section.title}
            </h3>
            {section.items.map((card, itemIndex) => {
              const questionId = `${sectionIndex}-${itemIndex}`;
              const isOpen = openQuestion === questionId;
              return (
                <article key={card.title} className="overflow-hidden rounded-2xl border border-[rgba(71,46,31,0.12)] bg-[#fffaf2]">
                  <button
                    type="button"
                    onClick={() => setOpenQuestion(isOpen ? "" : questionId)}
                    className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                  >
                    <span className="font-serif text-[clamp(1.35rem,2.4vw,1.9rem)] leading-[1] text-[#2a211c]">{card.title}</span>
                    <motion.span
                      animate={{ rotate: isOpen ? 45 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-2xl leading-none text-[#8a5a44]"
                    >
                      +
                    </motion.span>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        key="content"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        style={{ overflow: "hidden" }}
                      >
                        <div className="border-t border-[rgba(71,46,31,0.12)] px-6 pb-6 pt-4">
                          <p className="text-base leading-7 text-[#6a5a51]">{card.text}</p>
                          <div className="mt-4 flex flex-wrap gap-2">
                            {card.links.map(([label, href]) => (
                              <a
                                key={href}
                                href={href}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(93,52,38,0.16)] bg-white/80 px-4 py-1.5 text-sm font-semibold text-[#5d3426] transition hover:border-[rgba(93,52,38,0.35)] hover:bg-white"
                              >
                                <span>↗</span>
                                {label}
                              </a>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </article>
              );
            })}
          </div>
        ))}
      </div>
    </SectionCard>
  );
});

function StickyBar({ t }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const hero = document.querySelector("header");
    const rsvp = document.getElementById("rsvp");
    if (!hero || !rsvp) return;

    let heroGone = false;
    let rsvpVisible = false;

    const update = () => setShow(heroGone && !rsvpVisible);

    const heroObs = new IntersectionObserver(
      ([e]) => { heroGone = !e.isIntersecting; update(); },
      { threshold: 0 }
    );
    const rsvpObs = new IntersectionObserver(
      ([e]) => { rsvpVisible = e.isIntersecting; update(); },
      { threshold: 0.15 }
    );

    heroObs.observe(hero);
    rsvpObs.observe(rsvp);
    return () => { heroObs.disconnect(); rsvpObs.disconnect(); };
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 gap-2 rounded-full border border-white/70 bg-[rgba(255,250,243,0.92)] p-1.5 shadow-[0_8px_40px_rgba(72,40,23,0.22)] backdrop-blur-xl"
        >
          <a
            href="#menu"
            className="rounded-full border border-[rgba(71,46,31,0.12)] px-5 py-2.5 text-sm font-semibold text-[#5d3426] transition hover:bg-[rgba(71,46,31,0.06)]"
          >
            {t.menu.kicker}
          </a>
          <a
            href="#rsvp"
            className="rounded-full bg-gradient-to-br from-[#5d3426] to-[#8a5a44] px-5 py-2.5 text-sm font-bold text-white"
          >
            {t.hero.primary}
          </a>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default App;
