import { useMemo, useState, useEffect, useCallback, memo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Cursors } from "./components/Cursors";
import {
  LuMapPin, LuArrowUpRight, LuChevronDown,
  LuHeart, LuCar, LuWine, LuUtensils, LuFlag,
  LuMail, LuMap, LuCalendarDays, LuSunrise, LuCircleCheck,
} from "react-icons/lu";
import PhoneInput, { parsePhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";

const RSVP_ENDPOINT = import.meta.env.VITE_RSVP_ENDPOINT || "/api/rsvps";
const RSVP_LS_KEY = "wedding_rsvp_confirmed";

const content = {
  en: {
    ui: {
      siteLabel: "Wedding Weekend",
      day1Label: "9 May",
      day2Label: "10 May",
      footerDate: "9-10 May 2026 · Burgundy",
      transferLocationPlaceholder: "CDG, Orly, Gare de Lyon..."
    },
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
      selectionHint: "Tap a main course card to prefill your RSVP choice.",
      upcoming: "Coming soon",
      upcomingNote: "The menu details will be shared closer to the date."
    },
    rsvp: {
      kicker: "RSVP",
      title: "Reply with your menu choice",
      note: "Please reply by 15 April 2026. If you are coming with a +1, you can optionally add their name and choose a second main course below.",
      menuGroupTitleSingle: "Your menu choice",
      menuGroupTitlePair: "Menu choices for both of you",
      menuGroupNoteSingle: "Please choose your preferred main course below.",
      menuGroupNotePair: "Please choose one main course for yourself and one for your guest.",
      fields: {
        name: "Full name",
        email: "Email",
        phone: "Phone",
        attendance: "Will you attend?",
        plusOne: "Will you bring a +1?",
        plusOneName: "Full name of your +1 for place cards",
        events: "Which moments will you join?",
        menu: "Your main course choice",
        plusOneMenu: "Main course choice for your +1",
        plusOneMenuFor: "Main course choice for",
        transfer: "Do you need a transfer from Paris to Auxerre and back?",
        transferDetails: "Transfer details",
        arrivalDateTime: "When do you arrive in Paris?",
        arrivalLocation: "Which Paris airport or train station will you arrive at?",
        returnDateTime: "When is your flight or train back?",
        returnLocation: "Which airport or train station will you leave from?",
        transferPartySize: "How many people need a transfer?",
        dietary: "Dietary restrictions or allergies",
        notes: "Anything else we should know?"
      },
      options: {
        choose: "Please choose",
        yes: "Yes, with pleasure",
        no: "Sadly, no",
        plusOneYes: "Yes, I will bring a +1",
        plusOneNo: "No, just me",
        weddingAndBrunch: "Wedding day + brunch",
        weddingOnly: "Wedding day only",
        brunchOnly: "Brunch only",
        meat: "Meat",
        fish: "Fish",
        poultry: "Poultry",
        vegetarian: "Vegetarian",
        vegan: "Vegan",
        transferYes: "Yes",
        transferNo: "No"
      },
      submit: "Send RSVP",
      successRemote: "Thank you. Your RSVP has been sent.",
      successLocal:
        "RSVP saved in this browser for now. Add a real RSVP endpoint in the app to receive submissions online.",
      duplicate: "We already have your RSVP. If you need to make a change, please reach out to us directly.",
      error: "Something went wrong while sending the RSVP. Please try again.",
      confirmedTitle: "See you in Burgundy",
      confirmedNote: "Your RSVP is confirmed. We can't wait to celebrate with you.",
      confirmedAlreadyNote: "We already had your RSVP on file. We can't wait to celebrate with you."
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
      ["meat", "Meat", "Chef's meat main course selection."],
      ["fish", "Fish", "Market fish with bouillabaisse jus, aioli espuma, and fennel variations"],
      ["poultry", "Poultry", "Chef's poultry main course selection."],
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
          },
        ]
      },
      {
        title: "Auxerre",
        items: [
          {
            title: "Why we are here",
            text:
              "Auxerre was Lucas' home from the age of 12 to 19, just before he moved to Paris to study at Ecole 42 a few days before his birthday that year.\n\nAuxerre is still home to Valerie and Franck, who have explored every tiny corner of the city and the nearby vineyards during their long bike rides on summer days.\n\nAuxerre is a city Lucas told me so much about even before we started dating, describing how peaceful, green, easy, and calm life in this old Burgundy city is.\n\nAuxerre now holds a piece of mine and Phoebe's hearts, as we have spent so many great days and nights here, running and biking along the Yonne, watching AJA play at the home stadium, and sharing many good laughs over dinners at Lucas' parents'.\n\nWe have prepared a few tips to share with you, so maybe you will like it too and keep great memories of the city and of the couple of days we will spend together.",
            links: []
          },
          {
            title: "What to check",
            text: "If you have a little extra time, the old town centre, Saint-Etienne Cathedral, the clock tower area, and the riverfront are all worth seeing. If you feel like moving, you can also head to the Auxerre swimming pool, the athletics track, or the tennis courts. There is also a nice public workout spot in the city park, just next to the bridge.",
            links: [
              ["Auxerre swimming pool", "https://www.google.com/maps/search/?api=1&query=Stade+nautique+83+Avenue+Yver+89000+Auxerre"],
              ["Athletics track", "https://www.google.com/maps/search/?api=1&query=Stade+Guy+Drut+27+Rue+de+Preuilly+89000+Auxerre"],
              ["Tennis courts", "https://www.google.com/maps/search/?api=1&query=Stade+Auxerrois+Tennis+27+Rue+de+Preuilly+89000+Auxerre"]
            ]
          },
          {
            title: "Where to eat",
            text: "Good local picks include Le Goût des Autres, Mamma Giulia, and L'Asperule for lunch or dinner, plus Cannelle for coffee and breakfast.",
            links: [
              ["Le Gout des Autres", "https://www.google.com/maps/search/?api=1&query=Le+Gout+des+Autres+4+Place+du+Marechal+Leclerc+89000+Auxerre"],
              ["Mama Giulia", "https://www.google.com/maps/search/?api=1&query=Mamma+Giulia+3+Place+des+Cordeliers+89000+Auxerre"],
              ["L'Asperule", "https://www.google.com/maps/search/?api=1&query=L%27Asperule+34+Rue+du+Pont+89000+Auxerre"],
              ["Cannelle - coffee & breakfast", "https://www.google.com/maps/search/?api=1&query=Cannelle+12+Rue+Fecauderie+89000+Auxerre"]
            ]
          }
        ]
      }
    ]
  },
  fr: {
    ui: {
      siteLabel: "Week-end de mariage",
      day1Label: "9 mai",
      day2Label: "10 mai",
      footerDate: "9-10 mai 2026 · Bourgogne",
      transferLocationPlaceholder: "CDG, Orly, Gare de Lyon..."
    },
    hero: {
      eyebrow: "9-10 mai 2026 • Bourgogne",
      title: "Un week-end pour célébrer avec nous",
      text: "Toutes les informations utiles pour le mariage, le brunch du lendemain, le RSVP, le dîner et l'organisation pratique du voyage.",
      primary: "Confirmer sa venue",
      secondary: "Organiser son trajet"
    },
    welcome: {
      kicker: "Jour du mariage",
      title: "Samedi 9 mai 2026",
      text: "Nous commencerons à Auxerre pour la cérémonie civile, puis nous poursuivrons au Domaine du Roncemay pour l'après-midi et la soirée."
    },
    schedule: {
      kicker: "Programme",
      title: "Déroulé du 9 mai",
      note: "Les horaires sont indicatifs et pourront légèrement évoluer le jour J."
    },
    nextDay: {
      kicker: "Le lendemain",
      title: "Dimanche 10 mai 2026",
      note: "Un programme tranquille au Domaine du Roncemay, avec les transferts de retour dans l'après-midi."
    },
    menu: {
      kicker: "Dîner au Roncemay",
      title: "Le menu de notre dîner",
      note: "Nous avons choisi une entrée et un dessert dans la carte actuelle du Roncemay pour tout le monde, et chaque invité peut sélectionner son plat principal ci-dessous.",
      shared: "Pour tout le monde",
      choice: "À choisir",
      starterTitle: "Entrée",
      starterDish: "Œuf cocotte fermier au soumaintrain, confit de volaille et pain au levain",
      mainTitle: "Plat principal",
      dessertTitle: "Dessert",
      dessertDish:
        "La profiterole au gianduja, crème glacée, craquelin cacao et sauce gianduja avec quelques noisettes torréfiées",
      dietaryTitle: "Note alimentaire",
      dietaryText:
        "Des alternatives végétariennes et vegan pourront être préparées sur demande. Merci d'indiquer toute allergie ou restriction alimentaire dans le formulaire RSVP.",
      selectedLabel: "Plat sélectionné",
      selectionHint: "Touchez une carte pour préremplir votre choix dans le RSVP.",
      upcoming: "Bientôt disponible",
      upcomingNote: "Le menu sera partagé prochainement."
    },
    rsvp: {
      kicker: "RSVP",
      title: "Confirmez votre venue et votre menu",
      note: "Merci de répondre avant le 15 avril 2026. Si vous venez avec un +1, vous pouvez ajouter son nom et choisir un second plat principal ci-dessous.",
      menuGroupTitleSingle: "Votre choix de menu",
      menuGroupTitlePair: "Les choix de menu pour vous deux",
      menuGroupNoteSingle: "Merci de choisir votre plat principal ci-dessous.",
      menuGroupNotePair: "Merci de choisir un plat principal pour vous et un autre pour votre invite(e).",
      fields: {
        name: "Nom complet",
        email: "Email",
        phone: "Téléphone",
        attendance: "Serez-vous présent(e) ?",
        plusOne: "Viendrez-vous avec un +1 ?",
        plusOneName: "Nom complet de votre +1 pour les marque-places",
        events: "À quels moments serez-vous parmi nous ?",
        menu: "Votre choix de plat",
        plusOneMenu: "Choix du plat pour votre +1",
        plusOneMenuFor: "Choix du plat pour",
        transfer: "Avez-vous besoin d'un transfert de Paris à Auxerre puis du retour ?",
        transferDetails: "Détails du transfert",
        arrivalDateTime: "Quand arrivez-vous à Paris ?",
        arrivalLocation: "À quel aéroport ou dans quelle gare de Paris arrivez-vous ?",
        returnDateTime: "Quand est votre vol ou train retour ?",
        returnLocation: "Depuis quel aéroport ou quelle gare repartez-vous ?",
        transferPartySize: "Combien de personnes ont besoin du transfert ?",
        dietary: "Allergies ou régime alimentaire",
        notes: "Autre information utile"
      },
      options: {
        choose: "Merci de choisir",
        yes: "Oui, avec joie",
        no: "Malheureusement non",
        plusOneYes: "Oui, je viendrai avec un +1",
        plusOneNo: "Non, je viendrai seul(e)",
        weddingAndBrunch: "Mariage + brunch",
        weddingOnly: "Mariage uniquement",
        brunchOnly: "Brunch uniquement",
        meat: "Viande",
        fish: "Poisson",
        poultry: "Volaille",
        vegetarian: "Végétarien",
        vegan: "Vegan",
        transferYes: "Oui",
        transferNo: "Non"
      },
      submit: "Envoyer le RSVP",
      successRemote: "Merci. Votre réponse a bien été envoyée.",
      successLocal:
        "Le RSVP est enregistré dans ce navigateur pour le moment. Ajoutez un vrai endpoint dans l'app pour recevoir les réponses en ligne.",
      duplicate: "Nous avons déjà reçu votre réponse. Si vous souhaitez la modifier, contactez-nous directement.",
      error: "Une erreur est survenue pendant l'envoi. Merci de réessayer.",
      confirmedTitle: "À bientôt en Bourgogne",
      confirmedNote: "Votre réponse est bien enregistrée. On a hâte de fêter ça avec vous.",
      confirmedAlreadyNote: "Nous avions déjà votre réponse. On a hâte de fêter ça avec vous."
    },
    logistics: {
      kicker: "Logistique",
      title: "Informations de trajet et de séjour",
      note: "Parcourez les informations par thème ci-dessous. Ouvrez une question pour lire le détail, et revérifiez les horaires en temps réel plus près de la date."
    },
    scheduleItems: [
      {
        time: "13:30",
        title: "Accueil des invités à la Mairie d'Auxerre",
        description: "Merci d'arriver à partir de 13:30 afin que tout le monde soit installé avant la cérémonie.",
        location: "Mairie d'Auxerre",
        url: "https://maps.app.goo.gl/wDfwtcaomWeJhkoi6"
      },
      {
        time: "14:00",
        title: "Cérémonie civile à la Mairie d'Auxerre",
        description: "La cérémonie officielle commence à 14:00.",
        location: "Mairie d'Auxerre",
        url: "https://maps.app.goo.gl/wDfwtcaomWeJhkoi6"
      },
      {
        time: "Après la cérémonie",
        title: "Coupe de crémant",
        description: "Un verre pour célébrer ensemble juste après la cérémonie.",
        location: "Mairie d'Auxerre",
        url: "https://maps.app.goo.gl/wDfwtcaomWeJhkoi6"
      },
      {
        time: "15:15-15:45",
        title: "Transfert vers le Domaine du Roncemay",
        description: "Plage de transfert prévue entre Auxerre et le lieu de réception.",
        location: "Place de l'Arquebuse",
        url: "https://maps.app.goo.gl/kAozCZSt48x1raUN7"
      },
      {
        time: "16:00",
        title: "Goûter sur la terrasse du bistrot",
        description: "Une pause gourmande et détendue dans l'après-midi.",
        location: "Domaine du Roncemay",
        url: "https://maps.app.goo.gl/VFZitv9ZWvbp24r16"
      },
      {
        time: "18:00",
        title: "Apéro",
        description: "Verres, discussions et jolie lumière de fin de journée.",
        location: "Domaine du Roncemay",
        url: "https://maps.app.goo.gl/VFZitv9ZWvbp24r16"
      },
      {
        time: "19:00-00:00",
        title: "Dîner et soirée",
        description: "Le dîner commence à 19:00 et la fête se poursuit jusqu'à minuit.",
        location: "Domaine du Roncemay",
        url: "https://maps.app.goo.gl/VFZitv9ZWvbp24r16"
      }
    ],
    nextDayItems: [
      {
        time: "09:30",
        title: "Transfert depuis Auxerre",
        description: "Départ depuis le même point de rendez-vous à Auxerre pour les invités qui rejoignent le Domaine du Roncemay.",
        location: "Place de l'Arquebuse",
        url: "https://maps.app.goo.gl/kAozCZSt48x1raUN7"
      },
      {
        time: "10:00-12:00",
        title: "Brunch au Domaine du Roncemay",
        description: "Un brunch détendu tous ensemble au Domaine.",
        location: "Domaine du Roncemay",
        url: "https://maps.app.goo.gl/VFZitv9ZWvbp24r16"
      },
      {
        time: "12:00-14:00",
        title: "Initiation au golf",
        description:
          "Si vous préférez ne pas participer, vous pourrez profiter d'une balade à vélo, d'une partie de pétanque, d'une promenade dans le domaine ou simplement discuter avec les autres invités.",
        location: "Domaine du Roncemay",
        url: "https://maps.app.goo.gl/VFZitv9ZWvbp24r16"
      },
      {
        time: "16:00",
        title: "Transfert retour vers Auxerre",
        description: "Transfert de retour pour les invités qui repartent vers Auxerre.",
        location: "Domaine du Roncemay",
        url: "https://maps.app.goo.gl/VFZitv9ZWvbp24r16"
      },
      {
        time: "16:00",
        title: "Transfert vers Paris",
        description: "Départ du transfert direct pour les invités qui poursuivent ensuite vers Paris.",
        location: "Domaine du Roncemay",
        url: "https://maps.app.goo.gl/VFZitv9ZWvbp24r16"
      }
    ],
    menuOptions: [
      ["meat", "Viande", "Suggestion de plat de viande du chef."],
      ["fish", "Poisson", "Poisson du marché, jus bouillabaisse, espuma aïoli et déclinaison autour du fenouil"],
      ["poultry", "Volaille", "Suggestion de plat de volaille du chef."],
      ["vegetarian", "Végétarien", "Une assiette végétarienne de saison pourra être préparée sur demande."],
      ["vegan", "Vegan", "Une assiette vegan de saison pourra être préparée sur demande."]
    ],
    logisticsSections: [
      {
        title: "Transport",
        items: [
          {
            title: "Comment venir à Auxerre",
            text: "Auxerre est très facilement accessible en train depuis Paris Bercy Bourgogne. Les trajets directs durent souvent autour de 1 h 37 à 1 h 39.",
            links: [["Trains Paris > Auxerre", "https://www.sncf-connect.com/fr-fr/train/horaires/paris/auxerre"]]
          },
          {
            title: "De la gare d'Auxerre-Saint-Gervais à la Mairie",
            text: "La gare se trouve à une courte distance en taxi du centre-ville. À pied, comptez environ 20 à 25 minutes jusqu'à la Place de l'Hôtel de Ville.",
            links: [["Office de tourisme", "https://www.ot-auxerre.fr/espace-pro/contacts/"]]
          },
          {
            title: "Lieu de réception : Domaine du Roncemay",
            text: "La réception aura lieu au Domaine du Roncemay à Chassy. Auxerre se trouve à environ 22 km, soit environ 25 minutes de route.",
            links: [
              ["Infos pratiques du Domaine", "https://roncemay.com/fr/informations-pratiques.html"],
              ["Site du Domaine", "https://roncemay.com/fr/"]
            ]
          },
          {
            title: "Transfert du samedi matin : Paris vers Auxerre",
            text: "Le plus simple sera généralement de prendre un TER tôt le matin depuis Paris Bercy Bourgogne vers Auxerre-Saint-Gervais.",
            links: [["Vérifier les horaires SNCF", "https://www.sncf-connect.com/fr-fr/train/horaires/paris/auxerre"]]
          },
          {
            title: "Transfert du dimanche après-midi : Auxerre vers Paris",
            text: "Les retours vers Paris durent souvent autour de 1 h 44. Un train l'après-midi sera probablement le plus confortable.",
            links: [["Trains Auxerre > Paris", "https://www.sncf-connect.com/fr-ch/train/trajet/auxerre/paris"]]
          }
        ]
      },
      {
        title: "Hébergement",
        items: [
          {
            title: "Où loger à Auxerre",
            text: "Quelques options centrales incluent Hotel Le Maxime, Hotel Normandie et Ibis Budget Auxerre Centre. Nous recommandons de réserver tôt.",
            links: [
              ["Hotel Le Maxime", "https://www.ot-auxerre.fr/offres/hotel-le-maxime-bw-signature-collection-auxerre-fr-2563381/"],
              ["Hotel Normandie", "https://www.ot-auxerre.fr/offres/the-originals-hotel-normandie-auxerre-auxerre-fr-2563385/"],
              ["Guide touristique 2026", "https://www.ot-auxerre.fr/app/uploads/auxerrois/2026/03/OT_Guide-Touristique-2026-web.pdf"]
            ]
          },
        ]
      },
      {
        title: "Auxerre",
        items: [
          {
            title: "Pourquoi sommes-nous ici ?",
            text:
              "Auxerre a été la maison de Lucas de ses 12 ans à ses 19 ans, juste avant qu'il parte à Paris pour étudier à l'École 42, quelques jours avant son anniversaire cette année-là.\n\nAuxerre est toujours la maison de Valérie et Franck, qui ont exploré chaque petit coin de la ville et les vignobles voisins lors de leurs longues balades à vélo pendant les journées d'été.\n\nAuxerre est une ville dont Lucas m'a beaucoup parlé avant même que nous commencions à sortir ensemble, en me racontant à quel point la vie y est paisible, verte, simple et calme dans cette ancienne ville de Bourgogne.\n\nAuxerre garde maintenant un morceau de mon cœur et de celui de Phoebe, car nous y avons passé tant de belles journées et de belles soirées, à courir et faire du vélo le long de l'Yonne, à regarder jouer l'AJA dans son stade, et à partager beaucoup de rires autour de dîners chez les parents de Lucas.\n\nNous vous avons préparé quelques suggestions à partager avec vous, et nous espérons que vous aimerez vous aussi cette ville et que vous en garderez de beaux souvenirs, ainsi que des quelques jours que nous passerons ensemble.",
            links: []
          },
          {
            title: "Que voir ?",
            text: "Si vous avez un peu de temps, le centre historique, la cathédrale Saint-Étienne, le quartier de la tour de l'Horloge et les bords de l'Yonne valent le détour. Si vous avez envie de faire un peu de sport, vous pouvez aussi aller à la piscine d'Auxerre, à la piste d'athlétisme ou aux courts de tennis. Il y a également un joli espace public de sport dans le parc de la ville, juste à côté du pont.",
            links: [
              ["Piscine d'Auxerre", "https://www.google.com/maps/search/?api=1&query=Stade+nautique+83+Avenue+Yver+89000+Auxerre"],
              ["Piste d'athlétisme", "https://www.google.com/maps/search/?api=1&query=Stade+Guy+Drut+27+Rue+de+Preuilly+89000+Auxerre"],
              ["Courts de tennis", "https://www.google.com/maps/search/?api=1&query=Stade+Auxerrois+Tennis+27+Rue+de+Preuilly+89000+Auxerre"]
            ]
          },
          {
            title: "Où manger ?",
            text: "Pour les invités qui arrivent en avance, Le Goût des Autres, Mamma Giulia et L'Asperule sont de bonnes adresses pour déjeuner ou dîner, et Cannelle est parfait pour un café et un petit-déjeuner.",
            links: [
              ["Le Goût des Autres", "https://www.google.com/maps/search/?api=1&query=Le+Gout+des+Autres+4+Place+du+Marechal+Leclerc+89000+Auxerre"],
              ["Mamma Giulia", "https://www.google.com/maps/search/?api=1&query=Mamma+Giulia+3+Place+des+Cordeliers+89000+Auxerre"],
              ["L'Asperule", "https://www.google.com/maps/search/?api=1&query=L%27Asperule+34+Rue+du+Pont+89000+Auxerre"],
              ["Cannelle - café & petit-déjeuner", "https://www.google.com/maps/search/?api=1&query=Cannelle+12+Rue+Fecauderie+89000+Auxerre"]
            ]
          }
        ]
      }
    ]
  }
};

// Add your own photos here — picsum fills the rest indefinitely
const OWN_PHOTOS = [
  { src: "/US/us.jpeg",                                                           alt: "Ekaterina and Lucas",       caption: "Sep 2024" },
  { src: "/US/254F07A8-FABF-491D-9DB6-1881B81BE9FD.jpeg",                        alt: "Colares, Portugal",         caption: "Colares, Portugal · Nov 2024" },
  { src: "/US/80FC166B-DF1A-4BFA-A9EF-5279E290537A_1_102_a.jpeg",                alt: "Costa da Caparica",         caption: "Portugal · Nov 2024" },
  { src: "/US/870A20BA-B97F-4EDF-A30A-5847056A1E5E_1_102_o.jpeg",                alt: "Bourges, France",           caption: "Bourges, France · Jun 2025" },
  { src: "/US/2B1A780B-8A87-4BA3-BB9D-67B9E8A80431_4_5005_c.jpeg",               alt: "Champagne, France",         caption: "Champagne, France · Jul 2025" },
  { src: "/US/BBECA63C-E395-4D88-B611-8CCC5111D512_4_5005_c.jpeg",               alt: "Paris, France",             caption: "Paris, France · Jul 2025" },
  { src: "/US/us2.jpeg",                                                          alt: "Goðafoss, Iceland",         caption: "Goðafoss, Iceland · Aug 2025" },
  { src: "/US/2CF40FBA-0244-4D28-A4CF-D4E72139D41D_1_105_c.jpeg",                alt: "Snæfellsnes, Iceland",      caption: "Snæfellsnes, Iceland · Aug 2025" },
  { src: "/US/DC789284-ED0D-45BA-BE57-B0327786908C_1_105_c.jpeg",                alt: "Merry-sur-Yonne, Burgundy", caption: "Burgundy, France · Dec 2025" },
  { src: "/US/FFAC5587-E4E7-4DFA-A31F-7885B94E5D5C_1_105_c.jpeg",                alt: "New York",                  caption: "New York · Jan 2026" },
  { src: "/US/0A1CA3AF-D4A6-4B92-9607-7CFFF21CFB41_1_201_a.jpeg",                alt: "Saint-Malo, France",        caption: "Saint-Malo, France" },
  { src: "/bistro.jpeg",                                                          alt: "Roncemay, Burgundy",        caption: "Roncemay, Burgundy · Mar 2026" },
];

function getPhoto(i) {
  return OWN_PHOTOS[i % OWN_PHOTOS.length];
}

// Per-slot rotation & offset so the pile looks natural
const SLOT = [
  { rotate:  2.5, x:   0, y:  0 },   // top
  { rotate: -3.5, x:  -6, y:  9 },   // middle
  { rotate:  4.5, x:   8, y: 16 },   // back
];
const STACK = SLOT.length;

function HeroPhotoStack() {
  const [top, setTop] = useState(0); // absolute index of the card on top

  // Auto-advance
  useEffect(() => {
    const t = setInterval(() => setTop(i => i + 1), 4500);
    return () => clearInterval(t);
  }, []);

  // Pre-load upcoming
  useEffect(() => {
    [1, 2, 3].forEach(off => {
      const { src } = getPhoto(top + off);
      if (!src.startsWith("/")) { const img = new window.Image(); img.src = src; }
    });
  }, [top]);

  // top → slot 0, top+1 → slot 1, top+2 → slot 2
  const cards = Array.from({ length: STACK }, (_, slot) => ({ photoIdx: top + slot, slot }));

  return (
    <div className="flex items-center justify-center lg:justify-end">
      {/* Container is bigger than the card to absorb rotations */}
      <div className="relative" style={{ width: 320, height: 440 }}>
        <AnimatePresence>
          {cards.map(({ photoIdx, slot }) => {
            const photo = getPhoto(photoIdx);
            const { rotate, x, y } = SLOT[slot];
            return (
              <motion.figure
                key={photoIdx}
                className="absolute bg-white"
                style={{
                  width: 260, height: 340,
                  top: "50%", left: "50%",
                  marginTop: -170, marginLeft: -130,
                  zIndex: STACK - slot,
                  borderRadius: 16,
                  boxShadow: "0 4px 6px rgba(0,0,0,0.07), 0 12px 40px rgba(72,40,23,0.18)",
                }}
                initial={{ opacity: 0, scale: 0.88, rotate: SLOT[STACK - 1].rotate, x: SLOT[STACK - 1].x, y: SLOT[STACK - 1].y + 24 }}
                animate={{ opacity: 1, scale: 1 - slot * 0.025, rotate, x, y }}
                exit={{ opacity: 0, rotate: rotate + 20, x: 380, y: -80, scale: 0.8, zIndex: STACK + 1 }}
                transition={{ type: "spring", damping: 26, stiffness: 220 }}
              >
                {/* Photo */}
                <div style={{ margin: 10, marginBottom: 0, height: 272, overflow: "hidden", borderRadius: 10 }}>
                  <img src={photo.src} alt={photo.alt} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                </div>
                {/* Polaroid caption strip */}
                <div style={{ height: 58, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontFamily: "Georgia, serif", fontSize: 11, color: "#4d6858", opacity: 0.55, letterSpacing: "0.08em" }}>
                    {photo.caption}
                  </span>
                </div>
              </motion.figure>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

function getEventIcon(title) {
  const t = title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (t.includes("ceremony") || t.includes("civil") || t.includes("ceremonie")) return <LuHeart size={13} />;
  if (t.includes("transfer") || t.includes("transfert")) return <LuCar size={13} />;
  if (t.includes("toast") || t.includes("apero") || t.includes("cremant") || t.includes("coupe")) return <LuWine size={13} />;
  if (t.includes("dinner") || t.includes("brunch") || t.includes("tea") || t.includes("gouter") || t.includes("diner") || t.includes("lunch")) return <LuUtensils size={13} />;
  if (t.includes("golf")) return <LuFlag size={13} />;
  return <LuMapPin size={13} />;
}

function ScheduleSection({ t }) {
  const [activeDay, setActiveDay] = useState("day1");

  const tabs = [
    { id: "day1", icon: <LuCalendarDays size={13} />, label: t.ui.day1Label, note: t.schedule.note, items: t.scheduleItems },
    { id: "day2", icon: <LuSunrise size={13} />, label: t.ui.day2Label, note: t.nextDay.note, items: t.nextDayItems },
  ];

  const active = tabs.find((tab) => tab.id === activeDay);

  return (
    <SectionCard>
      <div className="mb-6 inline-flex rounded-full border border-[rgba(53,75,62,0.12)] bg-[rgba(248,242,233,0.6)] p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveDay(tab.id)}
            className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition ${
              activeDay === tab.id
                ? "bg-[#4a6355] text-white shadow-sm"
                : "text-[#576e63] hover:text-[#354b3e]"
            }`}
          >
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>
      {active.note && (
        <p className="mb-6 text-[0.8125rem] leading-relaxed text-[#354b3e]">{active.note}</p>
      )}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeDay}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
          className="divide-y divide-[rgba(53,75,62,0.08)]"
        >
          {active.items.map((item) => {
            const icon = getEventIcon(item.title);
            return (
              <div
                key={`${item.time}-${item.title}`}
                className="grid grid-cols-[72px_1fr] gap-x-4 py-4 first:pt-1 last:pb-0 md:grid-cols-[80px_minmax(180px,220px)_1fr_auto] md:items-center md:gap-x-6"
              >
                <div className="text-sm font-semibold tabular-nums text-[#4d6858]">{item.time}</div>
                <h3 className="inline-flex items-center gap-2 font-serif text-[1.05rem] leading-snug text-[#1e2a22]">
                  {icon && <span className="shrink-0 text-[#c4a06e]">{icon}</span>}
                  {item.title}
                </h3>
                <p className="col-start-2 mt-0.5 text-sm leading-6 text-[#354b3e] md:col-start-auto md:mt-0">{item.description}</p>
                <a href={item.url} target="_blank" rel="noreferrer"
                  className="col-start-2 mt-2 inline-flex w-fit items-center gap-1.5 rounded-full border border-[rgba(74,99,85,0.14)] bg-white/60 px-3 py-1 text-[11px] font-medium text-[#4d6858] transition hover:border-[rgba(74,99,85,0.3)] hover:bg-white md:col-start-auto md:mt-0">
                  <LuMapPin size={11} /> {item.location}
                </a>
              </div>
            );
          })}
        </motion.div>
      </AnimatePresence>
    </SectionCard>
  );
}

const fieldClass =
  "w-full rounded-2xl border border-[rgba(74,99,85,0.16)] bg-[#fffdf9] px-4 py-3 text-sm text-[#1e2a22] outline-none transition focus:border-[rgba(74,99,85,0.3)] focus:ring-2 focus:ring-[rgba(196,160,110,0.45)]";

function App() {
  const [lang, setLang] = useState("en");
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [attendance, setAttendance] = useState("");
  const [selectedMain, setSelectedMain] = useState("");
  const [events, setEvents] = useState("");
  const [transfer, setTransfer] = useState("");
  const [arrivalDateTime, setArrivalDateTime] = useState("");
  const [arrivalLocation, setArrivalLocation] = useState("");
  const [returnDateTime, setReturnDateTime] = useState("");
  const [returnLocation, setReturnLocation] = useState("");
  const [transferPartySize, setTransferPartySize] = useState("");
  const [hasPlusOne, setHasPlusOne] = useState("");
  const [plusOneName, setPlusOneName] = useState("");
  const [selectedPlusOneMain, setSelectedPlusOneMain] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneCountry, setPhoneCountry] = useState("FR");
  const [rsvpConfirmed, setRsvpConfirmed] = useState(() => {
    try { return JSON.parse(localStorage.getItem(RSVP_LS_KEY)) || null; } catch { return null; }
  });
  const t = content[lang];
  const menuRequired = attendance !== "no";
  const plusOneEnabled = menuRequired && hasPlusOne === "yes";

  useEffect(() => {
    fetch("/api/country")
      .then((r) => r.json())
      .then((data) => { if (data.country && data.country !== "XX") setPhoneCountry(data.country); })
      .catch(() => {});
  }, []);

  const handleSubmit = useCallback(async function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());
    payload.language = lang;
    payload.submittedAt = new Date().toISOString();
    payload.phone = phone || "";

    setSubmitting(true);
    setStatus("");
    try {
      if (RSVP_ENDPOINT) {
        const response = await fetch(RSVP_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (response.status === 409) {
          const data = await response.json();
          const confirmed = { name: payload.name, plusOneName: payload.plusOneName || "", already: true, token: data.token || null };
          localStorage.setItem(RSVP_LS_KEY, JSON.stringify(confirmed));
          setRsvpConfirmed(confirmed);
          return;
        }

        if (!response.ok) {
          throw new Error("Submission failed");
        }

        const data = await response.json();
        const confirmed = { name: payload.name, plusOneName: payload.plusOneName || "", already: false, token: data.token || null };
        localStorage.setItem(RSVP_LS_KEY, JSON.stringify(confirmed));
        setRsvpConfirmed(confirmed);
      } else {
        setStatus(t.rsvp.successLocal);
      }

      form.reset();
      setAttendance("");
      setSelectedMain("");
      setEvents("");
      setTransfer("");
      setArrivalDateTime("");
      setArrivalLocation("");
      setReturnDateTime("");
      setReturnLocation("");
      setTransferPartySize("");
      setHasPlusOne("");
      setPlusOneName("");
      setSelectedPlusOneMain("");
      setPhone("");
    } catch {
      setStatus(t.rsvp.error);
    } finally {
      setSubmitting(false);
    }
  }, [lang, t]);

  return (
    <div className="relative mx-auto my-4 w-[min(calc(100%-20px),1100px)] pb-28 sm:w-[min(calc(100%-48px),1100px)]">
      <header className="relative overflow-hidden rounded-[28px] border border-white/70 bg-[rgba(249,251,247,0.85)] p-5 shadow-[0_24px_80px_rgba(72,40,23,0.08)] backdrop-blur-xl">
        <div className="absolute -right-[10%] -bottom-[20%] h-[340px] w-[340px] rounded-full bg-radial from-[rgba(196,160,110,0.45)] to-transparent" />
        <div className="relative z-10 flex items-center justify-between gap-4">
          <div className="text-xs font-bold uppercase tracking-[0.14em] text-[#4a6355]">{t.ui.siteLabel}</div>
          <div className="inline-flex gap-2 rounded-full border border-[rgba(53,75,62,0.12)] bg-[rgba(249,251,247,0.7)] p-1.5">
            {["en", "fr"].map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setLang(code)}
                className={`rounded-full px-4 py-2.5 text-sm font-medium transition ${
                  lang === code ? "bg-[#4a6355] text-[#fffaf3]" : "text-[#576e63]"
                }`}
              >
                {code.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="relative z-10 grid items-center gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,400px)] lg:gap-10">
          <div className="max-w-[760px] py-7 md:py-10 lg:py-12">
            <p className="text-xs uppercase tracking-[0.14em] text-[#4a6355]">{t.hero.eyebrow}</p>
            <h1 className="mt-3 font-serif text-[clamp(2.6rem,7vw,5.5rem)] leading-[0.95] text-[#1e2a22]">
              {t.hero.title}
            </h1>
            <p className="mt-4 max-w-[56ch] text-base leading-7 text-[#354b3e]">{t.hero.text}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <a className="rounded-full bg-gradient-to-br from-[#4a6355] to-[#4d6858] px-6 py-3.5 font-bold text-white" href="#rsvp">
                {t.hero.primary}
              </a>
              <a
                className="rounded-full border border-[rgba(53,75,62,0.12)] bg-[rgba(249,251,247,0.9)] px-6 py-3.5 font-bold text-[#4a6355]"
                href="#logistics"
              >
                {t.hero.secondary}
              </a>
            </div>
          </div>
          <div className="flex items-center justify-center pb-10 lg:justify-end lg:pb-0">
            <HeroPhotoStack />
          </div>
        </div>
      </header>

      <main className="space-y-3 pt-3">
        <SectionCard>
          <SectionHeading kicker={t.welcome.kicker} title={t.welcome.title} note={t.welcome.text} />
        </SectionCard>

        <ScheduleSection t={t} />

        <SectionCard id="menu">
          <SectionHeading kicker={t.menu.kicker} title={t.menu.title} />
          <div className="flex items-center gap-4 py-2">
            <div className="h-px flex-1 bg-[rgba(53,75,62,0.08)]" />
            <p className="font-serif text-[1rem] italic text-[#4d6858]/50">{t.menu.upcomingNote}</p>
            <div className="h-px flex-1 bg-[rgba(53,75,62,0.08)]" />
          </div>
        </SectionCard>

        <SectionCard id="rsvp">
          <SectionHeading kicker={t.rsvp.kicker} title={t.rsvp.title} note={t.rsvp.note} />
          {rsvpConfirmed ? (
            <RsvpConfirmed name={rsvpConfirmed.name} plusOneName={rsvpConfirmed.plusOneName} already={rsvpConfirmed.already} t={t} />
          ) : (
          <form className="grid gap-8" onSubmit={handleSubmit}>

            {/* Contact */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t.rsvp.fields.name}>
                <input className={fieldClass} name="name" required />
              </Field>
              <Field label={t.rsvp.fields.email}>
                <input className={fieldClass} name="email" type="email" required />
              </Field>
              <Field label={t.rsvp.fields.phone}>
                <PhoneInput
                  international
                  defaultCountry={phoneCountry}
                  value={phone}
                  onChange={setPhone}
                  className="phone-input"
                />
              </Field>
            </div>

            {/* Attendance toggle */}
            <div className="grid gap-3">
              <p className="text-sm font-medium text-[#1e2a22]">{t.rsvp.fields.attendance}</p>
              <input type="hidden" name="attendance" value={attendance} />
              <div className="flex flex-wrap gap-2">
                {[["yes", t.rsvp.options.yes], ["no", t.rsvp.options.no]].map(([val, label]) => (
                  <button key={val} type="button" onClick={() => {
                    setAttendance(val);
                    if (val === "no") {
                      setEvents("");
                      setTransfer("");
                      setArrivalDateTime("");
                      setArrivalLocation("");
                      setReturnDateTime("");
                      setReturnLocation("");
                      setTransferPartySize("");
                      setSelectedMain("");
                      setHasPlusOne("");
                      setPlusOneName("");
                      setSelectedPlusOneMain("");
                    }
                  }}
                    className={`rounded-full px-6 py-3 text-sm font-semibold transition ${attendance === val ? "bg-[#4a6355] text-white shadow-sm" : "border border-[rgba(53,75,62,0.18)] bg-white/60 text-[#354b3e] hover:border-[rgba(53,75,62,0.35)] hover:bg-white"}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Progressive disclosure */}
            <AnimatePresence>
              {attendance === "yes" && (
                <motion.div key="yes-fields"
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.28 }}
                  className="grid gap-8">

                  {/* Events */}
                  <div className="grid gap-3">
                    <p className="text-sm font-medium text-[#1e2a22]">{t.rsvp.fields.events}</p>
                    <input type="hidden" name="events" value={events} />
                    <div className="flex flex-wrap gap-2">
                      {[["wedding-and-brunch", t.rsvp.options.weddingAndBrunch], ["wedding-only", t.rsvp.options.weddingOnly], ["brunch-only", t.rsvp.options.brunchOnly]].map(([val, label]) => (
                        <button key={val} type="button" onClick={() => setEvents(val)}
                          className={`rounded-full px-6 py-3 text-sm font-semibold transition ${events === val ? "bg-[#4a6355] text-white shadow-sm" : "border border-[rgba(53,75,62,0.18)] bg-white/60 text-[#354b3e] hover:border-[rgba(53,75,62,0.35)] hover:bg-white"}`}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Plus one */}
                  <div className="grid gap-4 rounded-[24px] border border-[rgba(71,46,31,0.12)] bg-[#fffaf2] p-5">
                    <div className="grid gap-2">
                      <p className="text-sm font-medium text-[#2a211c]">{t.rsvp.fields.plusOne}</p>
                      <input type="hidden" name="plusOne" value={hasPlusOne} />
                      <div className="flex flex-wrap gap-2">
                        {[["yes", t.rsvp.options.plusOneYes], ["no", t.rsvp.options.plusOneNo]].map(([val, label]) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => {
                              setHasPlusOne(val);
                              if (val !== "yes") {
                                setPlusOneName("");
                                setSelectedPlusOneMain("");
                              }
                            }}
                            className={`rounded-full px-6 py-3 text-sm font-semibold transition ${
                              hasPlusOne === val
                                ? "bg-[#5d3426] text-white shadow-sm"
                                : "border border-[rgba(71,46,31,0.18)] bg-white/60 text-[#3d2e26] hover:border-[rgba(71,46,31,0.35)] hover:bg-white"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {plusOneEnabled ? (
                      <Field label={t.rsvp.fields.plusOneName}>
                        <input
                          className={fieldClass}
                          name="plusOneName"
                          value={plusOneName}
                          onChange={(event) => setPlusOneName(event.target.value)}
                          required={plusOneEnabled}
                        />
                      </Field>
                    ) : null}
                  </div>

                  {/* Menu */}
                  <div className="grid gap-4 rounded-[24px] border border-[rgba(53,75,62,0.12)] bg-[#f7f9f6] p-5">
                    <div className="grid gap-2">
                      <h3 className="font-serif text-[clamp(1.5rem,2.5vw,2rem)] leading-[0.95] text-[#1e2a22]">
                        {plusOneEnabled ? t.rsvp.menuGroupTitlePair : t.rsvp.menuGroupTitleSingle}
                      </h3>
                      <p className="text-sm leading-6 text-[#354b3e]">
                        {plusOneEnabled ? t.rsvp.menuGroupNotePair : t.rsvp.menuGroupNoteSingle}
                      </p>
                    </div>

                    <div className={`grid gap-5 ${plusOneEnabled ? "lg:grid-cols-2" : ""}`}>
                      <div className="grid gap-3">
                        <p className="text-sm font-medium text-[#1e2a22]">{t.rsvp.fields.menu}</p>
                        <input type="hidden" name="menu" value={selectedMain} />
                        <div className="flex flex-wrap gap-2">
                          {t.menuOptions.map(([value, label]) => (
                            <button key={value} type="button" onClick={() => setSelectedMain(value)}
                              className={`rounded-full px-6 py-3 text-sm font-semibold transition ${selectedMain === value ? "bg-[#4a6355] text-white shadow-sm" : "border border-[rgba(53,75,62,0.18)] bg-white/60 text-[#354b3e] hover:border-[rgba(53,75,62,0.35)] hover:bg-white"}`}>
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {plusOneEnabled ? (
                        <div className="grid gap-3">
                          <p className="text-sm font-medium text-[#1e2a22]">{plusOneName.trim() ? `${t.rsvp.fields.plusOneMenuFor} ${plusOneName.trim().split(" ")[0]}` : t.rsvp.fields.plusOneMenu}</p>
                          <input type="hidden" name="plusOneMenu" value={selectedPlusOneMain} />
                          <div className="flex flex-wrap gap-2">
                            {t.menuOptions.map(([value, label]) => (
                              <button key={`plus-${value}`} type="button" onClick={() => setSelectedPlusOneMain(value)}
                                className={`rounded-full px-6 py-3 text-sm font-semibold transition ${selectedPlusOneMain === value ? "bg-[#4a6355] text-white shadow-sm" : "border border-[rgba(53,75,62,0.18)] bg-white/60 text-[#354b3e] hover:border-[rgba(53,75,62,0.35)] hover:bg-white"}`}>
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* Transfer */}
                  <div className="grid gap-3">
                    <p className="text-sm font-medium text-[#1e2a22]">{t.rsvp.fields.transfer}</p>
                    <input type="hidden" name="transfer" value={transfer} />
                    <div className="flex flex-wrap gap-2">
                      {[["yes", t.rsvp.options.transferYes], ["no", t.rsvp.options.transferNo]].map(([val, label]) => (
                        <button key={val} type="button" onClick={() => {
                          setTransfer(val);
                          if (val !== "yes") {
                            setArrivalDateTime("");
                            setArrivalLocation("");
                            setReturnDateTime("");
                            setReturnLocation("");
                            setTransferPartySize("");
                          }
                        }}
                          className={`rounded-full px-6 py-3 text-sm font-semibold transition ${transfer === val ? "bg-[#4a6355] text-white shadow-sm" : "border border-[rgba(53,75,62,0.18)] bg-white/60 text-[#354b3e] hover:border-[rgba(53,75,62,0.35)] hover:bg-white"}`}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {transfer === "yes" ? (
                    <div className="grid gap-4 rounded-[24px] border border-[rgba(53,75,62,0.12)] bg-[#f7f9f6] p-5">
                      <div className="grid gap-2">
                        <h3 className="font-serif text-[clamp(1.5rem,2.5vw,2rem)] leading-[0.95] text-[#1e2a22]">
                          {t.rsvp.fields.transferDetails}
                        </h3>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label={t.rsvp.fields.arrivalDateTime}>
                          <input
                            className={fieldClass}
                            name="arrivalDateTime"
                            type="datetime-local"
                            value={arrivalDateTime}
                            onChange={(event) => setArrivalDateTime(event.target.value)}
                            required={transfer === "yes"}
                          />
                        </Field>
                        <Field label={t.rsvp.fields.arrivalLocation}>
                          <input
                            className={fieldClass}
                            name="arrivalLocation"
                            value={arrivalLocation}
                            onChange={(event) => setArrivalLocation(event.target.value)}
                            placeholder={t.ui.transferLocationPlaceholder}
                            required={transfer === "yes"}
                          />
                        </Field>
                        <Field label={t.rsvp.fields.returnDateTime}>
                          <input
                            className={fieldClass}
                            name="returnDateTime"
                            type="datetime-local"
                            value={returnDateTime}
                            onChange={(event) => setReturnDateTime(event.target.value)}
                            required={transfer === "yes"}
                          />
                        </Field>
                        <Field label={t.rsvp.fields.returnLocation}>
                          <input
                            className={fieldClass}
                            name="returnLocation"
                            value={returnLocation}
                            onChange={(event) => setReturnLocation(event.target.value)}
                            placeholder={t.ui.transferLocationPlaceholder}
                            required={transfer === "yes"}
                          />
                        </Field>
                        <Field label={t.rsvp.fields.transferPartySize}>
                          <input
                            className={fieldClass}
                            name="transferPartySize"
                            type="number"
                            min="1"
                            step="1"
                            value={transferPartySize}
                            onChange={(event) => setTransferPartySize(event.target.value)}
                            required={transfer === "yes"}
                          />
                        </Field>
                      </div>
                    </div>
                  ) : null}

                  {/* Dietary */}
                  <Field label={t.rsvp.fields.dietary}>
                    <textarea className={fieldClass} name="dietary" rows="3" placeholder={t.rsvp.fields.notes} />
                  </Field>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex flex-col gap-3 pt-2 md:flex-row md:items-center md:justify-between">
              <button type="submit" disabled={submitting}
                className="w-full rounded-full bg-gradient-to-br from-[#4a6355] to-[#4d6858] px-6 py-3.5 font-bold text-white transition-opacity disabled:opacity-60 md:w-auto">
                {submitting ? "…" : t.rsvp.submit}
              </button>
              <p className="min-h-6 text-sm leading-6 text-[#576e63]">{status}</p>
            </div>
          </form>
          )}
        </SectionCard>

        <LogisticsSection t={t} />
      </main>

      <footer className="mt-8 py-8 text-center">
        <p className="font-serif text-[clamp(1.4rem,3vw,2rem)] leading-none text-[#4d6858]">
          Ekaterina &amp; Lucas
        </p>
        <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[#576e63]">{t.ui.footerDate}</p>
      </footer>

      <StickyBar t={t} />
      <Cursors />
    </div>
  );
}

function RsvpConfirmed({ name, plusOneName, already, t }) {
  const firstName = name ? name.trim().split(" ")[0] : "";
  const plusOneFirst = plusOneName ? plusOneName.trim().split(" ")[0] : "";
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center gap-6 py-10 text-center"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(74,99,85,0.1)] text-[#4a6355]">
        <LuCircleCheck size={36} strokeWidth={1.5} />
      </div>
      <div className="grid gap-2">
        <h3 className="font-serif text-[clamp(1.8rem,4vw,2.8rem)] leading-[1] text-[#1e2a22]">
          {t.rsvp.confirmedTitle}
          {firstName ? `, ${firstName}${plusOneFirst ? ` & ${plusOneFirst}` : ""}` : ""}.
        </h3>
        <p className="mx-auto max-w-[42ch] text-base leading-7 text-[#576e63]">
          {already ? t.rsvp.confirmedAlreadyNote : t.rsvp.confirmedNote}
        </p>
      </div>
      <div className="flex items-center gap-3 text-[#c4a06e]">
        <div className="h-px w-12 bg-[rgba(196,160,110,0.4)]" />
        <LuHeart size={14} />
        <div className="h-px w-12 bg-[rgba(196,160,110,0.4)]" />
      </div>
      <p className="text-xs uppercase tracking-[0.18em] text-[#4d6858]">{t.ui.footerDate}</p>
    </motion.div>
  );
}

function SectionCard({ children, id }) {
  return (
    <section
      id={id}
      className="rounded-[20px] border border-white/70 bg-[rgba(249,251,247,0.85)] p-4 shadow-[0_24px_80px_rgba(72,40,23,0.08)] backdrop-blur-xl md:p-6"
    >
      {children}
    </section>
  );
}

function SectionHeading({ kicker, title, note }) {
  return (
    <div className="mb-8">
      <div className="mb-4">
        <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(196,160,110,0.35)] bg-[rgba(196,160,110,0.08)] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.22em] text-[#4d6858]">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#c4a06e]" />
          {kicker}
        </span>
      </div>
      <h2 className="font-serif text-[clamp(1.9rem,3.8vw,3.2rem)] leading-[0.92] tracking-[-0.01em] text-[#1e2a22]">{title}</h2>
      {note ? <p className="mt-3 text-[0.8125rem] leading-relaxed text-[#354b3e]">{note}</p> : null}
    </div>
  );
}

function InfoCard({ title, text }) {
  return (
    <article className="rounded-2xl border border-[rgba(53,75,62,0.12)] bg-[#f7f9f6] p-6">
      <h3 className="mb-2 font-serif text-[clamp(1.5rem,2.6vw,2rem)] leading-[0.95]">{title}</h3>
      <p className="text-sm leading-6 text-[#354b3e]">{text}</p>
    </article>
  );
}


function Field({ label, children }) {
  return (
    <label className="grid gap-2 text-sm text-[#354b3e]">
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
          <div key={section.title} className="grid gap-2">
            <div className="flex items-center gap-3 px-1 pb-1">
              <div className="h-px flex-1 bg-[rgba(53,75,62,0.1)]" />
              <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-[#4a6355]">
                {section.title}
              </h3>
              <div className="h-px flex-1 bg-[rgba(53,75,62,0.1)]" />
            </div>
            {section.items.map((card, itemIndex) => {
              const questionId = `${sectionIndex}-${itemIndex}`;
              const isOpen = openQuestion === questionId;
              return (
                <article key={card.title} className="overflow-hidden rounded-2xl border border-[rgba(53,75,62,0.12)] bg-[#f7f9f6]">
                  <button
                    type="button"
                    onClick={() => setOpenQuestion(isOpen ? "" : questionId)}
                    className="flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-4 text-left transition-colors duration-150 hover:bg-[rgba(53,75,62,0.03)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[rgba(196,160,110,0.65)]"
                  >
                    <span className="font-serif text-[clamp(1.05rem,1.8vw,1.3rem)] leading-[1.2] text-[#1e2a22]">{card.title}</span>
                    <motion.span
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="shrink-0 text-[#4d6858]"
                    >
                      <LuChevronDown size={16} />
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
                        <div className="border-t border-[rgba(53,75,62,0.12)] px-5 pb-5 pt-4">
                          <p className="whitespace-pre-line text-sm leading-6 text-[#354b3e]">{card.text}</p>
                          {card.links.length ? (
                            <div className="mt-4 flex flex-wrap gap-2">
                              {card.links.map(([label, href]) => (
                                <a
                                  key={href}
                                  href={href}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(74,99,85,0.16)] bg-white/80 px-4 py-1.5 text-sm font-semibold text-[#4a6355] transition hover:border-[rgba(74,99,85,0.35)] hover:bg-white"
                                >
                                  <LuArrowUpRight size={12} />
                                  {label}
                                </a>
                              ))}
                            </div>
                          ) : null}
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
          className="fixed bottom-4 left-4 right-4 z-50 flex gap-2 rounded-full border border-white/70 bg-[rgba(249,251,247,0.92)] p-1.5 shadow-[0_8px_40px_rgba(72,40,23,0.22)] backdrop-blur-xl md:left-1/2 md:right-auto md:w-auto md:-translate-x-1/2"
        >
          <a href="#menu" className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-[rgba(53,75,62,0.12)] px-4 py-2.5 text-sm font-semibold text-[#4a6355] transition hover:bg-[rgba(53,75,62,0.06)]">
            <LuUtensils size={13} /> <span className="hidden sm:inline">{t.menu.kicker}</span>
          </a>
          <a href="#rsvp" className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-br from-[#4a6355] to-[#4d6858] px-4 py-2.5 text-sm font-bold text-white">
            <LuMail size={13} /> {t.hero.primary}
          </a>
          <a href="#logistics" className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-[rgba(53,75,62,0.12)] px-4 py-2.5 text-sm font-semibold text-[#4a6355] transition hover:bg-[rgba(53,75,62,0.06)]">
            <LuMap size={13} /> <span className="hidden sm:inline">{t.logistics.kicker}</span>
          </a>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default App;
