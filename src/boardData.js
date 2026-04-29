export const weddingBoardCsv = String.raw`
"Task,Status,Priority,Responsible,Location,Deadline,Notes"
"Location selection,In progress,High,Both,TBD,,"
"Cake - pièce montée,Not started,High,Kat,Auxerre,,Confirm delivery + design"
"Transfer Paris → Auxerre,Not started,High,Kat,Paris/Auxerre,,"
"Transfer Auxerre ↔ Domaine (9 May),Not started,High,Kat,Auxerre/Domaine,09/05/2026,14:45 & 23:00"
"Transfer Auxerre ↔ Domaine (10 May),Not started,High,Kat,Auxerre/Domaine,10/05/2026,09:30 & 16:00"
"M&Ms order,Not started,Low,Kat,Online,,"
"Guest cards,Not started,Medium,Kat,Online,,"
"Seating map for guests,Not started,High,Both,Online,,"
"Flower bouquet,Not started,High,Kat,Auxerre,,"
"Flowers for tables,Not started,Medium,Kat,Domaine,,"
"Menu selection,In progress,High,Both,Domaine,,"
"Final guest list,In progress,High,Both,Online,28/04/2026,Hard deadline"
"Accommodation recommendations,In progress,Medium,Kat,Auxerre,,"
"Get disposable cameras,Not started,Low,Kat,Online,,"
"Book photographer,Not started,High,Kat,Auxerre,,"
"Make-up booking,In progress,High,Kat,Auxerre,,"
"Hair booking,Not started,High,Kat,Auxerre,,"
"Nails (before D-Day),Not started,Medium,Kat,Paris,,"
"Lucas shoes,Not started,Medium,Lucas,Paris,,"
"Lucas tie,Not started,Low,Lucas,Paris,,"
"Lucas pants fitting (Suitsupply),Not started,High,Lucas,Paris,,"
"Kat dress fittings,In progress,High,Kat,Paris,,"
"Shoes protection,Not started,Low,Kat,Online,,"
"Kat second shoes (gravel),Not started,Medium,Kat,Online,,"
"Auxerre translator (ceremony),Not started,Medium,Kat,Auxerre,,"
"Send Sam documents (mairie witnesses),In progress,High,Kat,Online,,"
"Victorien & Ocean accommodation,Not started,Medium,Kat,Auxerre,,"
"Kat underwear (D-Day),Not started,High,Kat,Paris,,"
"Kat outfit (Day 2),Not started,Low,Kat,Paris,,"
"Kat earrings,Not started,Medium,Kat,Paris,,"
"Get rings from Hermès,Not started,High,Both,Paris,,"
"Make-up rehearsal (Sasha),Not started,High,Kat,Paris,,"
`;

export const adminBoardCsv = String.raw`
Task | Status | Owner | Start Date | End Date | Dependency | Category | Priority
Lukas passport received | Waiting | Lukas | 2026-03-17 | 2026-03-27 |  | Visa Prep | High
IELTS exam | Done | Lukas | 2026-03-20 | 2026-03-20 |  | Visa Prep | High
IELTS results received | Waiting | Lukas | 2026-03-25 | 2026-03-27 | IELTS exam | Visa Prep | High
Verify IELTS score | Waiting | Lukas | 2026-03-27 | 2026-03-27 | IELTS results received | Visa Prep | High
Confirm CoS | Done | Lukas | 2026-03-17 | 2026-03-25 |  | Visa Prep | High
Notify landlord (send letter) | Planned | Both | 2026-03-28 | 2026-03-28 | IELTS results received | France Exit | High
Lease end (Paris) | Planned | Both | 2026-03-28 | 2026-06-28 | Notify landlord | France Exit | High
Apply Skilled Worker Visa | Planned | Lukas | 2026-04-04 | 2026-04-04 | Passport + IELTS | Visa | Critical
Biometrics appointment | Planned | Lukas | 2026-04-05 | 2026-04-10 | Apply Skilled Worker Visa | Visa | High
Visa processing (Lukas) | Planned | Lukas | 2026-04-05 | 2026-04-25 | Biometrics | Visa | Critical
Receive visa (Lukas) | Planned | Lukas | 2026-04-25 | 2026-04-25 | Visa processing | Visa | Critical
Marriage ceremony | Planned | Both | 2026-05-09 | 2026-05-09 |  | Marriage | Critical
Receive marriage certificate | Planned | Both | 2026-05-09 | 2026-05-10 | Marriage ceremony | Marriage | Critical
Send for translation | Planned | You | 2026-05-14 | 2026-05-14 | Marriage certificate | Marriage | High
Receive translation | Planned | You | 2026-05-16 | 2026-05-16 | Send for translation | Marriage | High
Apply Dependant Visa | Planned | You | 2026-05-19 | 2026-05-19 | Translation | Visa | Critical
Biometrics (You) | Planned | You | 2026-05-20 | 2026-05-22 | Apply Dependant Visa | Visa | High
Visa processing (You - priority) | Planned | You | 2026-05-20 | 2026-05-24 | Biometrics | Visa | Critical
Receive visa (You) | Planned | You | 2026-05-24 | 2026-05-24 | Processing | Visa | Critical
Start apartment search (Cardiff) | Planned | Both | 2026-05-01 | 2026-05-20 | Lukas visa pending | Housing | High
Viewings | Planned | Both | 2026-05-10 | 2026-05-25 | Search | Housing | High
Sign lease UK | Planned | Both | 2026-05-20 | 2026-05-30 | Lukas visa approved | Housing | Critical
Enter UK (Lukas) | Planned | Lukas | 2026-05-25 | 2026-05-30 | Visa approved | UK Setup | Critical
Register NI number | Planned | Lukas | 2026-05-26 | 2026-06-10 | Enter UK | UK Setup | High
Register GP (NHS) | Planned | Lukas | 2026-05-26 | 2026-06-10 | Enter UK | UK Setup | Medium
Open UK bank account | Planned | Lukas | 2026-05-26 | 2026-06-10 | Enter UK | UK Setup | High
Research car | Planned | Both | 2026-05-25 | 2026-06-05 | UK arrival | Car | Medium
Test drive | Planned | Both | 2026-06-01 | 2026-06-08 | Research | Car | Medium
Buy car | Planned | Both | 2026-06-05 | 2026-06-10 | Test drive | Car | High
Check driving license exchange | Planned | Both | 2026-05-25 | 2026-06-05 | UK arrival | Admin | Medium
Apply for UK license (if needed) | Planned | Both | 2026-06-05 | 2026-06-20 | Check rules | Admin | Low
Declutter & sell items | Planned | Both | 2026-04-01 | 2026-06-01 |  | Moving | Medium
Research movers | Planned | Both | 2026-04-10 | 2026-05-10 |  | Moving | High
Book moving company | Planned | Both | 2026-05-10 | 2026-05-20 | Research movers | Moving | High
Pack belongings | Planned | Both | 2026-06-01 | 2026-06-20 | Booking | Moving | High
Romania trip | Planned | Both | 2026-06-11 | 2026-06-14 | Both visas ready | Travel | Medium
`;
