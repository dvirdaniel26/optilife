import { useContext, useEffect, useState } from 'react';
import { UserContext } from '../App';
import { supabase } from '../lib/supabase';
import { Loader2, FileSearch } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import { explainMedicalMarker } from '../lib/gemini';

const MARKER_DICTIONARY = {
  'glucose': { title: 'גלוקוז (Glucose)', description: 'הפחמימה הפשוטה ביותר והמקור המרכזי לאנרגיה של תאי הגוף והמוח. רמתו בדם נשלטת על ידי אינסולין המופרש מהלבלב. חריגות מעידות לרוב על בעיה ביעילות האינסולין (תנגודת לאינסולין) או בייצורו.', high: 'מצביע על תנגודת לאינסולין, טרום-סוכרת או סוכרת. לרוב נובע מתזונה עתירת פחמימות ריקות וסוכרים, השמנה בטנית, חוסר פעילות גופנית, או סטרס כרוני המעלה את הורמון הקורטיזול.', low: 'היפוגליקמיה. מצב שעלול לגרום לעייפות פתאומית, רעד, בלבול וסחרחורת. לרוב נגרם מדילוג ממושך על ארוחות, פעילות גופנית מאומצת ללא גיבוי תזונתי מתאים, או כתוצאה ממינון יתר של תרופות להורדת סוכר/אינסולין.', normal: '70-100 mg/dL' },
  'cholesterol': { title: 'כולסטרול (Cholesterol)', description: 'מולקולה דמוית שומן החיונית לבניית מעטפת התאים, ייצור הורמוני מין (טסטוסטרון, אסטרוגן), וייצור ויטמין D. המדד הכללי בבדיקה זו מייצג את הסך הכולל של ה-HDL (הכולסטרול "הטוב") וה-LDL (הכולסטרול "הרע"). מדד כללי גבוה אינו בהכרח מסוכן ודורש התבוננות מעמיקה בפיזור הפנימי (יחס בין HDL ל-LDL והטריגליצרידים).', high: 'מחייב הסתכלות על חלוקת ה-LDL וה-HDL. עודף כולסטרול כללי אינו תמיד בעיה, אך אם הוא מלווה ב-LDL גבוה ובטריגליצרידים גבוהים, הוא מהווה גורם סיכון ממשי לטרשת עורקים, הצטברות פלאק, ומחלות לב וכלי דם.', low: 'רמות נמוכות מדי נדירות יחסית, אך עלולות להפריע לייצור התקין של הורמונים מרכזיים, לפגוע במעטפת התא, ולעיתים מצביעות על תזונה דלה במיוחד או פגיעה כבדית.', normal: 'מתחת ל-200 mg/dL' },
  'hdl': { title: 'HDL (כולסטרול "הטוב")', description: 'ליפופרוטאין בצפיפות גבוהה. ה-HDL מתפקד כ"משאית זבל" - הוא עובר בזרם הדם, אוסף עודפי כולסטרול מהעורקים ומהתאים, ומחזיר אותם לכבד לפירוק והפרשה מחוץ לגוף. מולקולה זו מגנה מפני מחלות לב.', high: 'מצב מצוין ומגן. רמות גבוהות מסייעות במניעת הצטברות פלאק בדם, ומעידות לרוב על אורח חיים בריא, כושר גופני אירובי טוב, ותזונה עשירה בשומנים בריאים (כגון שמן זית, אבוקדו ודגים).', low: 'מהווה גורם סיכון למחלות לב ולתסמונת מטבולית. נובע לרוב מהשמנה בטנית, חוסר פעילות גופנית, עישון, מתח כרוני או תזונה עתירת פחמימות ריקות.', normal: 'מעל 40 (גברים) או 50 (נשים) mg/dL' },
  'ldl': { title: 'LDL (כולסטרול "הרע")', description: 'ליפופרוטאין בצפיפות נמוכה. תפקידו התקין הוא לשאת כולסטרול מהכבד אל תאי הגוף שזקוקים לו. הבעיה נוצרת כשיש עודף של LDL בזרם הדם, ובמיוחד כשהוא מתחמצן ונדבק לדפנות כלי הדם.', high: 'עודף LDL (ובמיוחד חלקיקי LDL קטנים ודחוסים) שוקע בדפנות העורקים, מעודד תהליך דלקתי באנדותל (ציפוי העורק), ויוצר רובד טרשתי המעלה משמעותית את הסיכון להתקף לב ושבץ מוחי.', low: 'מצב תקין ורצוי. רמות נמוכות מקטינות סיכון למחלות כלי דם ומהוות יעד טיפולי במטופלים הנמצאים בסיכון או הנוטלים סטטינים.', normal: 'מתחת ל-130 mg/dL' },
  'triglycerides': { title: 'טריגליצרידים (Triglycerides)', description: 'הצורה המרכזית בה הגוף אוגר אנרגיה עודפת (קלוריות). כשאנו אוכלים יותר ממה שאנו שורפים - ובמיוחד עודפים של סוכר ופחמימות - הכבד הופך את הפחמימות לטריגליצרידים אשר מופרשים לדם ונאגרים ברקמת השומן.', high: 'מעיד על עודף צריכת קלוריות, סוכרים או פחמימות פשוטות, ביחס להוצאה האנרגטית של הגוף. רמות גבוהות קשורות להתפתחות כבד שומני, תנגודת לאינסולין, והן מרכיב מרכזי בתסמונת המטבולית.', low: 'מצב תקין, מצוין ורצוי. מעיד על חילוף חומרים אנרגטי יעיל, ניצול נכון של שומנים ופחמימות בגוף, ורגישות טובה מאוד לאינסולין.', normal: 'מתחת ל-150 mg/dL' },
  'iron': { title: 'ברזל (Iron)', description: 'מינרל קריטי ביותר ליצירת מולקולת ההמוגלובין (החלבון המוביל חמצן בדם) ולתהליכי ייצור האנרגיה התוך-תאיים במיטוכונדריה. ללא ברזל, התאים "נחנקים" מחוסר חמצן.', high: 'רמות עודפות עלולות להיות רעילות לגוף. יכול לנבוע מנטילת יתר של תוספי ברזל, פגיעה כבדית, ערוי דם מרובים או מחלות אגירת ברזל גנטיות (כגון המוכרומטוזיס).', low: 'גורם להתפתחות אנמיה מחוסר ברזל. יבוא לידי ביטוי בעייפות קשה, חולשה כללית, נשירת שיער מוגברת, חיוורון, קושי בריכוז, סחרחורות ולעיתים אף קוצר נשימה במאמץ.', normal: '60-170 mcg/dL' },
  'hemoglobin': { title: 'המוגלובין (Hemoglobin)', description: 'מולקולת חלבון עשירה בברזל הנמצאת בתוך כדוריות הדם האדומות. תפקידה הייעודי הוא ללכוד חמצן בריאות, לשנע אותו במחזור הדם ולשחרר אותו לתאי הגוף לייצור אנרגיה.', high: 'יכול להעיד על התייבשות עמוקה המרכזת את הדם, עישון כבד הגורם לחוסר חמצן כרוני, מחלת ריאות, או שהייה ממושכת באזורים בגובה רב בהם האוויר דליל בחמצן.', low: 'מצב המוגדר כ"אנמיה". משמעות הדבר היא שמספר מולקולות נשיאת החמצן קטן מדי. התאים לא יקבלו מספיק חמצן ולכן תורגש עייפות, חולשה משמעותית וירידה בתפקוד.', normal: '12-18 g/dL' },
  'wbc': { title: 'WBC (תאי דם לבנים)', description: 'החיילים של מערכת החיסון בגוף. קבוצת תאים זו מסיירת במחזור הדם וברקמות במטרה לאתר, לבלוע ולהשמיד חיידקים, נגיפים, טפילים ותאים אבנורמליים (כמו תאים סרטניים).', high: '"לויקוציטוזיס" - זוהי לרוב תגובה תקינה לחלוטין של הגוף במטרה להילחם בזיהום (לרוב חיידקי), או עקב דלקת חריפה, סטרס קיצוני, פציעה או נטילת סטרואידים.', low: '"לויקופניה" - מצביע על זיהום ויראלי פעיל שגורם להרס התאים הלבנים, חסרים תזונתיים קיצוניים, דיכוי מערכת החיסון מתרופות, או בעיה כלשהי בייצור התאים במח העצם.', normal: '4,500-11,000 /mcL' },
  'rbc': { title: 'RBC (תאי דם אדומים)', description: 'תאי הדם האדומים המהווים את ה"משאיות" הנושאות את ההמוגלובין והחמצן מהריאות אל כל שאר חלקי הגוף.', high: 'מצב הנקרא "פוליציטמיה". מופיע לרוב כפיצוי של הגוף על חוסר חמצן כרוני (דום נשימה בשינה, עישון) או עקב התייבשות שמקטינה את נפח הפלזמה ומעלה את ריכוז התאים בדם.', low: 'מדד לאנמיה. מתרחש לרוב כתוצאה ממחסור באבני בניין לייצור כדוריות (ברזל, חומצה פולית, ויטמין B12), דימום כרוני פעיל או הרס מוגבר של כדוריות אדומות.', normal: '4.2-5.9 M/uL' },
  'platelets': { title: 'טסיות דם (Platelets / PLT)', description: 'הטסיות הן שברי תאים זעירים הנוצרים במח העצם ומסיירים בדם. תפקידן המרכזי הוא קרישת דם: במקרה של פציעה בכלי דם, הן מזנקות לאזור, נדבקות אחת לשנייה ויוצרות "פקק" לעצירת הדימום.', high: 'תגובה נפוצה וזמנית לדלקת, חוסר ברזל קיצוני המאלץ ייצור מוגבר במח העצם, פציעה חריפה או סטרס פיזי גדול.', low: 'מצב של מיעוט טסיות המסכן את הגוף בדימומים ספונטניים. נגרם לרוב מזיהומים ויראליים שונים, מחלות אוטואימוניות שבהן הגוף תוקף את הטסיות של עצמו, או תגובה לתרופות מסוימות.', normal: '150,000-450,000 /mcL' },
  'plt': { title: 'טסיות דם (Platelets / PLT)', description: 'הטסיות הן שברי תאים זעירים הנוצרים במח העצם ומסיירים בדם. תפקידן המרכזי הוא קרישת דם: במקרה של פציעה בכלי דם, הן מזנקות לאזור, נדבקות אחת לשנייה ויוצרות "פקק" לעצירת הדימום.', high: 'תגובה נפוצה וזמנית לדלקת, חוסר ברזל קיצוני המאלץ ייצור מוגבר במח העצם, פציעה חריפה או סטרס פיזי גדול.', low: 'מצב של מיעוט טסיות המסכן את הגוף בדימומים ספונטניים. נגרם לרוב מזיהומים ויראליים שונים, מחלות אוטואימוניות שבהן הגוף תוקף את הטסיות של עצמו, או תגובה לתרופות מסוימות.', normal: '150,000-450,000 /mcL' },
  'hba1c': { title: 'המוגלובין מסוכרר (HbA1C)', description: 'מדד המשקף את ממוצע רמות הסוכר בדם לאורך 2-3 החודשים האחרונים. ה-HbA1C מודד למעשה איזה אחוז מכלל מולקולות ההמוגלובין בדם "התקרמלו" והתחברו לסוכר באופן קבוע.', high: 'ערך של 5.7%-6.4% מעיד על טרום-סוכרת (מומלץ לבצע שינוי באורח חיים). 6.5% ומעלה מהווה קריטריון לאבחנת סוכרת. דורש התערבות רפואית ותזונתית.', low: 'תקין ובריא. משקף רמות סוכר מאוזנות ויציבות. עם זאת, רמות נמוכות באופן קיצוני עלולות להיגרם במטופלי סוכרת החווים אירועי היפוגליקמיה תכופים.', normal: 'מתחת ל-5.7%' },
  'neutrophils': { title: 'נויטרופילים (Neutrophils)', description: 'תת-סוג מרכזי של תאי דם לבנים, המשמשים כ"קו ההגנה הראשון" של המערכת החיסונית. הם הראשונים לזנק לאזור של זיהום בגוף (לרוב חיידקי) במטרה לבלוע ולהשמיד את החיידקים.', high: 'מעיד לרוב על נוכחות של זיהום חיידקי חריף, מצב דלקתי פעיל בגוף, פציעה או טראומה.', low: 'מצב המכונה "נויטרופניה" אשר עלול לחשוף ולהחליש את עמידות הגוף לזיהומים בצורה משמעותית. לרוב נגרם מזיהום נגיפי חריף או מתרופות.', normal: '40%-75% מכלל ה-WBC' },
  'lymphocytes': { title: 'לימפוציטים (Lymphocytes)', description: 'תאי דם לבנים האחראים על הזיכרון החיסוני ועל הטיפול וההשמדה של זיהומים נגיפיים (וירוסים) וחיסול של תאים סרטניים.', high: 'מעיד בדרך כלל על כך שהגוף נלחם בזיהום ויראלי פעיל (כמו שפעת, מחלת הנשיקה - EBV/CMV).', low: 'עלול להעיד על פגיעה מתמשכת במערכת החיסון, זיהומים ויראליים מסוימים שמדכאים תאים אלו, תת-תזונה או שימוש בתרופות המדכאות חיסון.', normal: '20%-45% מכלל ה-WBC' },
  'monocytes': { title: 'מונוציטים (Monocytes)', description: 'ה"שואבים" של מערכת החיסון. אלו הם תאי דם לבנים גדולים שבולעים חיידקים, גופים זרים ותאים מתים, ומסייעים בהחלמה מזיהומים ארוכי-טווח.', high: 'מצביע בדרך כלל על תהליך של התאוששות הגוף מזיהום (ויראלי או חיידקי) או על מחלה דלקתית כרונית.', low: 'לרוב אינו בעל משמעות קלינית משמעותית לכשעצמו.', normal: '2%-10% מכלל ה-WBC' },
  'eosinophils': { title: 'אאוזינופילים (Eosinophils)', description: 'תאי דם לבנים אשר נועדו בעיקר להילחם בזיהומי טפילים (תולעים), אך באורח החיים המודרני הם קשורים בעיקר לתגובות אלרגיות.', high: 'מצביע באופן כמעט בלעדי על נטייה קיימת לאלרגיה, התקף אסתמה, או (במדינות מתפתחות) על זיהום טפילי במערכת העיכול.', low: 'לרוב אינו בעל משמעות קלינית ויכול להתרחש במצבי מתח.', normal: '1%-6% מכלל ה-WBC' },
  'creatinine': { title: 'קריאטינין (Creatinine)', description: 'תוצר פירוק טבעי וקבוע של פעילות השרירים בגוף, אשר מופרש החוצה דרך הכליות. בדיקה זו מהווה את המדד האמין ביותר לבחינת תפקודי כליות.', high: 'כאשר הכליות אינן מצליחות לסנן את הקריאטינין ביעילות, רמתו בדם עולה. הדבר יכול להעיד על ירידה בתפקוד הכלייתי (מחלת כליות), התייבשות, חסימת שתן או נטילת תוספי קריאטין/חלבון בכמות גבוהה מאוד.', low: 'לרוב אין בכך סכנה ממשית, הדבר פשוט מעיד על מסת שריר נמוכה מאוד, תזונה דלה, או הריון (בו הפינוי הכלייתי גובר).', normal: '0.6-1.2 mg/dL' },
  'urea': { title: 'אוריאה (Urea / BUN)', description: 'תוצר פירוק של חלבונים מהתזונה, המיוצר בכבד ומופרש בשתן על ידי הכליות. משמש כמדד עזר לתפקודי כליות ולרמת פירוק החלבון בגוף.', high: 'יכול להעיד על התייבשות, תזונה עתירת חלבונים, דמם במערכת העיכול, או ירידה בתפקוד כלייתי (במיוחד כשהקריאטינין גבוה גם כן).', low: 'עלול להעיד על תזונה דלה במיוחד בחלבון, ספיגה לקויה במעיים, או מחלת כבד כרונית הפוגעת בייצור האוריאה.', normal: '10-45 mg/dL' },
  'ast': { title: 'AST (GOT)', description: 'אנזים המצוי בתוך תאי הכבד, אך גם בשריר הלב ובשרירי השלד. בדיקה המשמשת להערכת תפקודי כבד ונזק שרירי.', high: 'מעיד על הרס או נזק לתאי הכבד (כבד שומני, הפטיטיס, צריכת אלכוהול מוגברת) אך יכול גם לעלות משמעותית בעקבות מאמץ שרירי ואימוני כוח עצימים.', low: 'מצב תקין. אין משמעות קלינית לרמות נמוכות.', normal: '10-40 U/L' },
  'alt': { title: 'ALT (GPT)', description: 'אנזים ייחודי המצוי כמעט אך ורק בכבד. רמתו בדם מהווה מדד מדויק ורגיש במיוחד לפגיעה ספציפית בתאי הכבד.', high: 'עליה ב-ALT מצביעה בבירור על נזק כבדי: מחלת כבד שומני לא-אלכוהולית (שכיח מאוד כיום), דלקת כבד נגיפית, או נזק מרעילות של תרופות ו/או אלכוהול.', low: 'מצב תקין ורצוי.', normal: '10-40 U/L' },
  'bilirubin': { title: 'בילירובין (Bilirubin)', description: 'צבען (פיגמנט) צהבהב, תוצר הפירוק הטבעי של כדוריות דם אדומות מבוגרות. הכבד אחראי לעבד ולהפריש אותו מהגוף דרך כיס המרה.', high: 'רמות גבוהות גורמות להצהבת העור והעיניים (צהבת). מצביע על עומס בפירוק דם, בעיה כבדית, חסימה בדרכי המרה, או תסמונת גילברט הגנטית השכיחה.', low: 'מצב תקין. רמות נמוכות אינן מהוות בעיה רפואית.', normal: 'עד 1.2 mg/dL' },
  'ferritin': { title: 'פריטין (Ferritin)', description: 'זהו החלבון האחראי לאגירת הברזל בתוך תאי הגוף. בדיקת פריטין היא המדד המדויק ביותר המראה את "מחסני" רזרבות הברזל הזמינות לגוף לתקופה ארוכה.', high: 'מכיוון שפריטין הוא גם חלבון דלקת, רמתו עלולה לעלות משמעותית בזמן דלקת פעילה (ואז אינו משקף אגירת ברזל אמיתית). לחילופין, מעיד על עומס ועודף ברזל גנטי או נטילת תוספים רבה.', low: 'זהו הסימן המוקדם והרגיש ביותר להתפתחות אנמיה מחוסר ברזל (עוד לפני שיש ירידה בהמוגלובין). מחייב התערבות תזונתית או מתן תוסף.', normal: '12-300 ng/mL' },
  'b12': { title: 'ויטמין B12', description: 'ויטמין חיוני ביותר לתפקוד תקין של מערכת העצבים והמוח, וליצירת כדוריות דם אדומות תקינות במח העצם.', high: 'לרוב תקין - עודפים מופרשים בקלות בשתן ואינם מצטברים. חריגות קיצוניות מצריכות בדיקת רופא לבירור מקור העודף.', low: 'חוסר בויטמין גורם לאנמיה ולפגיעה עצבית בלתי הפיכה העשויה להתבטא בחולשה כללית, עקצוצים ונימול בגפיים, עייפות ובלבול. נפוץ מאוד בקרב טבעונים ללא נטילת תוסף מתאים.', normal: '200-900 pg/mL' },
  'folic acid': { title: 'חומצה פולית (Folic Acid)', description: 'מוכר גם כויטמין B9. חיוני ביותר לייצור ושכפול של תאים חדשים בגוף, ובמיוחד כדוריות דם אדומות.', high: 'לרוב תקין (עודפים מופרשים בשתן ואינם מסוכנים).', low: 'מחסור יוביל לאנמיה (תאים מוגדלים ולא מתפקדים). רמה נאותה קריטית לנשים בגיל הפוריות, שכן חסר עלול לגרום למומים קשים בצינור העצבי של העובר בחודש הראשון להריון.', normal: 'מעל 4 ng/mL' },
  'tsh': { title: 'TSH', description: 'הורמון המופרש מבלוטת יותרת המוח ותפקידו לגרות ולהפעיל את בלוטת התריס, האחראית על ויסות קצב חילוף החומרים בגוף.', high: 'כשהבלוטה "עצלה" (תת-פעילות), המוח מפריש עוד ועוד TSH כדי לעורר אותה. התסמינים לרוב יכללו עייפות קשה, עלייה במשקל, רגישות לקור וקשיי ריכוז.', low: 'המוח מזהה שהבלוטה פעילה מדי (פעילות יתר), ומפסיק לשלוח את הורמון הגירוי TSH. התסמינים יהיו ירידה מהירה במשקל, דופק מואץ, נדודי שינה וחרדה.', normal: '0.4-4.0 mIU/L' },
  'vitamin d': { title: 'ויטמין D', description: 'פרו-הורמון החיוני בראש ובראשונה לספיגת סידן מהתזונה, לשמירה על צפיפות העצם ולחיזוק המערכת החיסונית המולדת.', high: 'נדיר ביותר מהשמש, מתרחש בעיקר בעקבות נטילת מנת-יתר קיצונית של תוספי תזונה, ועשוי לגרום להסתיידות של איברים שונים.', low: 'נפוץ ביותר עקב הימנעות מחשיפה לשמש. חוסר ממושך גורם לחולשת עצמות, כאבי שרירים כרוניים, עייפות ורגישות לזיהומים. נדרשת חשיפה מבוקרת לשמש או נטילת תוסף מתאים.', normal: '20-50 ng/mL' },
  'crp': { title: 'CRP', description: 'חלבון המיוצר ומפריש הכבד לזרם הדם בתגובה לתהליכים דלקתיים. זהו מדד "אקוטי" - הוא מזנק במהירות תוך שעות מתחילת דלקת וצונח כשהיא חולפת.', high: 'רמה מוגברת מעידה בבירור על נוכחות של זיהום פעיל (לרוב זיהום חיידקי), דלקת ברקמה כלשהי, נזק טראומטי משמעותי, או התפרצות של מחלה אוטואימונית. אין זה מעיד היכן הדלקת ממוקמת אלא רק על קיומה.', low: 'תקין. המשמעות היא שאין בגוף דלקת פעילה חמורה.', normal: 'עד 5 mg/L' },
  'hscrp': { title: 'hs-CRP (רגישות גבוהה)', description: 'בדיקת CRP בעלת רגישות גבוהה ביותר, שנועדה לאתר רמות דלקת מיקרוסקופיות (כרוניות) בדפנות כלי הדם. משמשת כמדד חשוב להערכת הסיכון למחלות לב והתקפי לב.', high: 'מעיד על דלקת כרונית מזערית בגוף (Low grade inflammation). רמות קבועות מעל 3 mg/L מקושרות לסיכון כפול ויותר לאירועי לב, עקב היווצרות פלאק דלקתי בעורקים.', low: 'תקין. מצביע על סיכון נמוך לתחלואת לב ודלקתיות אפסית באנדותל כלי הדם.', normal: 'מתחת ל-1.0 mg/L' },
  'sodium': { title: 'נתרן (Sodium / Na)', description: 'מינרל ואלקטרוליט המצוי בנוזל שמחוץ לתאים. הוא הכרחי לשמירת מאזן הנפח והנוזלים בגוף ולתפקוד תקין של מערכת העצבים והתכווצות השרירים.', high: '"היפרנתרמיה" - מעיד בדרך כלל על איבוד נוזלים (התייבשות חמורה) או צריכה עודפת של נתרן דרך המזון או תרופות. יכול לגרום לעלייה בלחץ הדם ובצקות.', low: '"היפונתרמיה" - חוסר איזון נפוץ. יכול להיגרם משתיית כמות נוזלים עצומה ובלתי פרופורציונלית, הקאות, שלשולים או שימוש קבוע בתרופות משתנות. מצב מסוכן שעלול לגרום לבצקת מוחית.', normal: '135-145 mEq/L' },
  'potassium': { title: 'אשלגן (Potassium / K)', description: 'מינרל ואלקטרוליט חיוני המצוי ברובו הגדול בתוך תאי הגוף. בעל חשיבות עליונה לתפקוד עצבי תקין, כיווץ שרירי השלד, ובעיקר – סדירות הפעולה של שריר הלב.', high: 'מצב מסכן חיים המכונה "היפרקלמיה". עלול לשבש את הפעילות החשמלית של הלב ולגרום להפרעות קצב מסוכנות. לרוב מצביע על בעיה קשה בתפקוד הכלייתי או נטילת תרופות המשמרות אשלגן.', low: '"היפוקלמיה" - נגרם לעיתים תכופות מאיבוד אשלגן בשתן עקב שימוש בתרופות (משתנים), הקאות או שלשולים מרובים. גורם לחולשת שרירים קשה, התכווצויות, והפרעות מסוכנות בקצב הלב.', normal: '3.5-5.1 mEq/L' },
  'calcium': { title: 'סידן (Calcium / Ca)', description: 'המינרל הנפוץ ביותר בגופנו. אבן הבניין המרכזית של העצמות והשיניים, אך כמות קטנה ממנו בדם קריטית לכיווץ שרירים (וביניהם הלב), מנגנון קרישת הדם, והעברת אותות עצביים.', high: 'רמות סידן גבוהות בדם ("היפרקלצמיה") עלולות להעיד על פעילות יתר או גידול בבלוטת יותרת התריס (Parathyroid), וכן פירוק מוגבר של העצם בעקבות מחלות או גידולים שונים.', low: 'רמה נמוכה ("היפוקלצמיה") גורמת לעוררות יתר עצבית, התכווצויות שרירים כואבות ("טטניה"), והפרעות קצב לב. עלול להצביע על חוסר בוויטמין D עמוק, בעיה בכליות או תת-פעילות בלוטת יותרת התריס.', normal: '8.5-10.5 mg/dL' },
};
function getMarkerInfo(rawName) {
  if (!rawName) return null;
  const name = rawName.toLowerCase();
  for (const [key, info] of Object.entries(MARKER_DICTIONARY)) {
    if (name.includes(key) || info.title.toLowerCase().includes(name)) return info;
  }
  return null;
}

export default function AnalysisResultsPage() {
  const { profile, session } = useContext(UserContext);
  const firstName = profile?.first_name || 'אורח/ת';
  const navigate = useNavigate();
  const location = useLocation();
  const isFemale = profile?.gender === 'female';
  const passedTestId = location.state?.testId;

  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [testData, setTestData] = useState(null);
  const [labResults, setLabResults] = useState([]);
  const [insight, setInsight] = useState(null);
  const [hasPlan, setHasPlan] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [markerInfoState, setMarkerInfoState] = useState({ loading: false, info: null, error: null });

  const handleMarkerClick = async (result) => {
    setSelectedMarker(result);
    const localInfo = getMarkerInfo(result.marker_name);
    
    if (localInfo) {
      setMarkerInfoState({ loading: false, info: localInfo, error: null });
    } else {
      setMarkerInfoState({ loading: true, info: null, error: null });
      try {
        const aiInfo = await explainMedicalMarker(result.marker_name);
        setMarkerInfoState({ loading: false, info: aiInfo, error: null });
      } catch (err) {
        setMarkerInfoState({ loading: false, info: null, error: err.message });
      }
    }
  };

  const closeMarkerModal = () => {
    setSelectedMarker(null);
    setMarkerInfoState({ loading: false, info: null, error: null });
  };

  const renderStyledText = (rawText) => {
    const parts = rawText.split('**');
    return parts.map((part, partIdx) => {
      if (partIdx % 2 === 1) {
        return <strong key={partIdx} className="font-semibold text-primary">{part}</strong>;
      }
      return part;
    });
  };

  const renderFormattedSummary = (text) => {
    if (!text) return null;
    const lines = text.split('\n').filter(p => p.trim());
    const elements = lines.map((line, idx) => {
      const trimmed = line.trim();
      const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('* ');
      if (isBullet) {
        const content = trimmed.replace(/^[-*]\s+/, '');
        return (
          <div key={idx} className="flex items-start gap-3 py-2 border-b border-slate-50 last:border-0">
            <span className="mt-2 w-2 h-2 rounded-full bg-secondary shrink-0" />
            <p className="leading-7 text-sm text-on-surface-variant font-body flex-1">
              {renderStyledText(content)}
            </p>
          </div>
        );
      }
      return (
        <p key={idx} className="leading-8 text-sm text-on-surface-variant font-body">
          {renderStyledText(trimmed)}
        </p>
      );
    });
    return <div className="space-y-3">{elements}</div>;
  };


  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [passedTestId]);

  useEffect(() => {
    const fetchData = async () => {
      if (!session?.user?.id) return;
      
      try {
        let activeTest = null;
        if (passedTestId) {
          const { data: specificTest, error: testError } = await supabase
            .from('medical_tests')
            .select('*')
            .eq('id', passedTestId)
            .maybeSingle();
          
          if (testError) throw testError;
          activeTest = specificTest;
        } else {
          // 1. Fetch latest test
          const { data: latestTest, error: testError } = await supabase
            .from('medical_tests')
            .select('*')
            .eq('user_id', session.user.id)
            .in('status', ['completed', 'נותח'])
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (testError) {
            throw testError;
          }
          activeTest = latestTest;
        }

        if (activeTest) {
          setTestData(activeTest);
          
          // 2. Fetch lab results for this test
          const { data: results, error: resultsError } = await supabase
            .from('lab_results')
            .select('*')
            .eq('test_id', activeTest.id);
            
          if (resultsError) throw resultsError;
          setLabResults(results || []);

          // 3. Fetch insights for this test
          const { data: insights, error: insightsError } = await supabase
            .from('ai_insights')
            .select('*')
            .eq('test_id', activeTest.id)
            .limit(1)
            .maybeSingle();
            
          if (insightsError) throw insightsError;
          if (insights) setInsight(insights);

          // 4. Check if an action plan already exists for this specific test
          const { data: existingPlan } = await supabase
            .from('ai_insights')
            .select('id')
            .eq('test_id', activeTest.id)
            .like('summary_text', 'ACTION_PLAN:%')
            .limit(1)
            .maybeSingle();
          setHasPlan(!!existingPlan);
        }
      } catch (error) {
        console.error('Error fetching analysis data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [session, passedTestId]);

  if (loading) {
    return (
      <main className="md:pr-72 pt-24 min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-secondary animate-spin" />
      </main>
    );
  }

  if (!testData) {
    return (
      <main className="md:pr-72 pt-24 min-h-screen transition-all">
        <div 
          style={{ width: '100%', minWidth: '280px' }}
          className="p-xl max-w-6xl mx-auto flex flex-col items-center justify-center h-[60vh] text-center"
        >
          <div className="w-24 h-24 bg-primary/5 rounded-full flex items-center justify-center mb-6">
            <FileSearch className="w-12 h-12 text-primary/40" />
          </div>
          <h2 className="font-heading text-3xl text-primary font-bold mb-4">טרם נותחו בדיקות</h2>
          <p 
            style={{ width: '100%', maxWidth: '480px', display: 'block', margin: '0 auto 32px' }}
            className="text-on-surface-variant text-lg"
          >
            לא מצאנו תוצאות מעבדה המקושרות לחשבון שלך. {isFemale ? 'העלי' : 'העלה'} את תוצאות בדיקת הדם שלך כדי שמנוע ה-AI שלנו יוכל לנתח אותן.
          </p>
          <button 
            onClick={() => navigate('/upload')}
            className="bg-accent-action text-primary font-bold px-8 py-4 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95"
          >
            {isFemale ? 'העלי בדיקה ראשונה' : 'העלה בדיקה ראשונה'}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="md:pr-72 pt-24 min-h-screen transition-all bg-background">
      <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto space-y-6 md:space-y-8">
        
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
          <div className="space-y-1">
            <h1 className="font-heading text-3xl text-primary font-black">תוצאות הניתוח</h1>
            <p className="text-on-surface-variant text-xs md:text-sm font-semibold flex flex-wrap gap-x-2 gap-y-1">
              <span>סוג: <span className="text-primary">{testData.test_name}</span></span>
              <span className="opacity-40">|</span>
              <span>תאריך ביצוע: <span className="text-primary">{new Date(testData.test_date).toLocaleDateString('he-IL')}</span></span>
              <span className="opacity-40">|</span>
              <span>תאריך העלאה: <span className="text-primary">{new Date(testData.created_at).toLocaleDateString('he-IL')}</span></span>
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button 
              onClick={async () => {
                if(window.confirm('האם אתה בטוח שברצונך למחוק בדיקה זו?')) {
                  setIsDeleting(true);
                  try {
                    const { data: { session: currentSession } } = await supabase.auth.getSession();
                    if (!currentSession) return;
                    await fetch('/api/delete-test', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentSession.access_token}` },
                      body: JSON.stringify({ testId: testData.id })
                    });
                    navigate('/tests');
                  } catch (e) {
                    console.error('Failed to delete test', e);
                    setIsDeleting(false);
                  }
                }
              }}
              disabled={isDeleting}
              className={`font-bold px-4 py-2 rounded-xl text-sm transition-all border-0 ${
                isDeleting 
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed flex items-center gap-2' 
                  : 'bg-red-50 text-red-500 hover:bg-red-100 cursor-pointer'
              }`}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  מוחק...
                </>
              ) : (
                'מחק בדיקה'
              )}
            </button>
            <button 
              onClick={() => navigate('/tests')}
              className="flex items-center gap-1.5 text-slate-600 hover:text-primary font-bold text-sm bg-slate-50 hover:bg-slate-100 px-4 py-2.5 rounded-xl transition-all cursor-pointer w-fit border border-slate-200 hover:border-slate-300 shadow-sm"
            >
              <span className="material-symbols-outlined text-base">list_alt</span>
              <span>כל הבדיקות</span>
            </button>
            <button 
              onClick={() => navigate('/upload')}
              className="flex items-center gap-1.5 text-secondary hover:text-secondary/80 font-bold text-sm bg-secondary/5 hover:bg-secondary/10 px-4 py-2.5 rounded-xl transition-all cursor-pointer w-fit border border-secondary/10 hover:border-secondary/20 shadow-sm"
            >
              <span className="material-symbols-outlined text-base">cloud_upload</span>
              <span>העלאת בדיקה נוספת</span>
            </button>
          </div>
        </div>

        {insight && (
          <div className="bg-gradient-to-br from-secondary/5 via-white to-primary/5 p-5 md:p-8 rounded-2xl custom-shadow border border-secondary/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 bottom-0 w-1.5 bg-gradient-to-b from-secondary to-primary"></div>
            <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
              <span className="p-2 bg-secondary/15 text-secondary rounded-xl">
                <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'wght' 500" }}>psychology</span>
              </span>
              <div>
                <h2 className="font-heading text-xl text-primary font-bold leading-tight">ניתוח AI מקצועי</h2>
                <p className="text-[11px] text-on-surface-variant font-semibold mt-0.5">פירוש הממצאים וחיבור בין המדדים</p>
              </div>
            </div>
            <div className="text-right pr-2" dir="rtl">
              {renderFormattedSummary(insight.summary_text)}
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl custom-shadow border border-slate-100 overflow-hidden mt-8">
          <div className="p-5 md:p-6 border-b border-slate-50 flex items-center justify-between">
            <h3 className="text-lg font-bold text-primary font-heading flex items-center gap-2">
              <span className="p-1.5 bg-primary/10 text-primary rounded-lg">
                <span className="material-symbols-outlined text-xl">science</span>
              </span>
              <span>מדדים שזוהו בתמונה</span>
            </h3>
            <span className="text-[10px] font-extrabold bg-primary/5 text-primary px-2.5 py-1 rounded-full uppercase">
              {labResults.length} מדדים
            </span>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-50/50 text-on-surface-variant text-xs font-bold uppercase tracking-wider">
                  <th className="px-6 py-4 border-b border-slate-100">מדד</th>
                  <th className="px-6 py-4 border-b border-slate-100">תוצאה</th>
                  <th className="px-6 py-4 border-b border-slate-100">טווח נורמה</th>
                  <th className="px-6 py-4 border-b border-slate-100">סטטוס</th>
                </tr>
              </thead>
              <tbody className="text-on-surface font-body text-sm">
                {labResults.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="text-center py-8 text-on-surface-variant font-semibold">לא זוהו מדדים ספציפיים בבדיקה זו.</td>
                  </tr>
                ) : (
                  labResults.map((result) => (
                    <tr 
                      key={result.id} 
                      className="hover:bg-slate-50/30 transition-colors cursor-pointer group"
                      onClick={() => handleMarkerClick(result)}
                    >
                      <td className="px-6 py-4 border-b border-slate-50 font-bold text-primary group-hover:text-secondary" dir="ltr">{result.marker_name}</td>
                      <td className="px-6 py-4 border-b border-slate-50 font-black text-primary" dir="ltr">
                        {result.measured_value} <span className="text-xs font-semibold text-on-surface-variant">{result.unit}</span>
                      </td>
                      <td className="px-6 py-4 border-b border-slate-50 text-on-surface-variant font-semibold" dir="ltr">
                        {result.normal_range_min !== null && result.normal_range_max !== null 
                          ? `${result.normal_range_min} - ${result.normal_range_max}`
                          : result.normal_range_max !== null
                            ? `< ${result.normal_range_max}`
                            : result.normal_range_min !== null
                              ? `> ${result.normal_range_min}`
                              : 'לא זמין'}
                      </td>
                      <td className="px-6 py-4 border-b border-slate-50">
                        {result.is_abnormal ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-status-error/10 text-status-error">
                            מחוץ לטווח
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-status-success/10 text-status-success">
                            תקין
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="block md:hidden space-y-3 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
            {labResults.length === 0 ? (
              <div className="text-center py-8 text-on-surface-variant font-semibold">לא זוהו מדדים ספציפיים בבדיקה זו.</div>
            ) : (
              labResults.map((result) => (
                <div 
                  key={result.id} 
                  onClick={() => handleMarkerClick(result)}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden p-4 pr-5 transition-all hover:shadow-md cursor-pointer"
                >
                  {/* Status Indicator Bar */}
                  <div 
                    className={`absolute right-0 top-0 bottom-0 w-1.5 ${
                      result.is_abnormal ? 'bg-status-error' : 'bg-status-success'
                    }`}
                  />
                  
                  {/* Card Header: Marker Name & Status Badge */}
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-base font-black text-primary" dir="ltr">
                      {result.marker_name}
                    </span>
                    {result.is_abnormal ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-status-error/10 text-status-error border border-status-error/20">
                        <span className="material-symbols-outlined text-xs">warning</span>
                        <span>חורג מהנורמה</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-status-success/10 text-status-success border border-status-success/20">
                        <span className="material-symbols-outlined text-xs">check_circle</span>
                        <span>תקין</span>
                      </span>
                    )}
                  </div>
                  
                  {/* Card Content: Result vs Range */}
                  <div className="grid grid-cols-2 gap-4 border-t border-slate-50 pt-3">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-bold block mb-0.5">תוצאה נמדדת</span>
                      <div className="flex items-baseline gap-1" dir="ltr">
                        <span className={`text-lg font-black ${result.is_abnormal ? 'text-status-error' : 'text-primary'}`}>
                          {result.measured_value}
                        </span>
                        <span className="text-xs font-semibold text-on-surface-variant">
                          {result.unit}
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-bold block mb-0.5">טווח תקין</span>
                      <div className="flex items-baseline gap-1 text-primary font-semibold text-sm" dir="ltr">
                        <span>
                          {result.normal_range_min !== null && result.normal_range_max !== null 
                            ? `${result.normal_range_min} - ${result.normal_range_max}`
                            : result.normal_range_max !== null
                              ? `< ${result.normal_range_max}`
                              : result.normal_range_min !== null
                                ? `> ${result.normal_range_min}`
                                : 'לא זמין'}
                        </span>
                        <span className="text-xs font-medium text-on-surface-variant">
                          {result.unit}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <button 
            onClick={() => navigate(`/plan?testId=${testData.id}`)}
            className="w-full sm:w-auto bg-accent-action hover:shadow-lg transition-all rounded-full py-3.5 px-8 flex items-center justify-center gap-2 text-primary font-bold active:scale-95 text-base min-w-[280px] border-0 cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">{hasPlan ? 'favorite' : 'bolt'}</span>
            <span>{hasPlan
              ? 'צפה בתוכנית הבריאות'
              : isFemale ? 'צרי תוכנית פעולה אישית' : 'צור תוכנית פעולה אישית'}</span>
          </button>
        </div>

        {/* Medical Disclaimer Banner */}
        <div className="mt-8 bg-amber-50/70 border border-amber-200/50 rounded-2xl p-4 flex items-start gap-3 text-right" dir="rtl">
          <span className="material-symbols-outlined text-amber-600 text-2xl shrink-0 mt-0.5" style={{ fontVariationSettings: "'wght' 500" }}>warning</span>
          <div>
            <h4 className="font-bold text-amber-900 text-xs mb-1">הבהרה רפואית חשובה:</h4>
            <p className="text-amber-800 text-[10px] leading-relaxed font-semibold">
              הניתוח וההמלצות לעיל הופקו באופן אוטומטי על ידי מודל בינה מלאכותית (Gemini AI). מידע זה נועד להעשרה בלבד ואינו מחליף חוות דעת רפואית מקצועית, אבחון או טיפול רפואי. אין להשתמש במידע זה לצורך קביעת טיפול רפואי או תזונתי ללא התייעצות עם רופא מוסמך.
            </p>
          </div>
        </div>
      </div>

      {/* Marker Info Modal */}
      {selectedMarker && (() => {
        const { loading: infoLoading, info, error } = markerInfoState;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn" dir="rtl" onClick={closeMarkerModal}>
            <div 
              className="bg-white w-full max-w-lg max-h-[90vh] flex flex-col rounded-3xl custom-shadow overflow-hidden transform transition-all border border-slate-100"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/50 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-secondary/10 text-secondary rounded-xl flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined">science</span>
                  </div>
                  <div>
                    <h3 className="font-heading text-xl font-bold text-primary" dir="ltr">{info ? info.title : selectedMarker.marker_name}</h3>
                    <p className="text-xs text-on-surface-variant font-semibold mt-0.5">מדריך למדדי הדם</p>
                  </div>
                </div>
                <button 
                  onClick={closeMarkerModal}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all border-0 cursor-pointer shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="overflow-y-auto flex-1 min-h-0">
              {infoLoading ? (
                <div className="flex flex-col items-center justify-center py-16 px-6">
                  <Loader2 className="w-12 h-12 animate-spin text-secondary mb-4" />
                  <p className="text-primary font-bold">Gemini AI מנתח את המדד...</p>
                  <p className="text-xs text-slate-500 mt-1">מייצר הסבר מותאם אישית</p>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-12 px-6">
                  <span className="material-symbols-outlined text-4xl text-red-400 mb-3">error</span>
                  <p className="text-red-600 font-bold">לא ניתן היה לטעון מידע עבור מדד זה.</p>
                  <button onClick={closeMarkerModal} className="mt-4 text-slate-500 underline text-sm">סגור</button>
                </div>
              ) : info ? (
                <div className="p-6 space-y-6">
                  <div>
                    <h4 className="font-bold text-primary mb-2 flex items-center gap-1.5 text-sm">
                      <span className="material-symbols-outlined text-[18px] text-secondary">info</span>
                      מה זה אומר?
                    </h4>
                    <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                      {info.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-red-50/50 border border-red-100 p-4 rounded-2xl">
                      <h4 className="font-bold text-red-700 mb-2 flex items-center gap-1.5 text-sm">
                        <span className="material-symbols-outlined text-[18px]">trending_up</span>
                        רמה גבוהה
                      </h4>
                      <p className="text-xs text-red-900/80 leading-relaxed">{info.high}</p>
                    </div>
                    <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-2xl">
                      <h4 className="font-bold text-blue-700 mb-2 flex items-center gap-1.5 text-sm">
                        <span className="material-symbols-outlined text-[18px]">trending_down</span>
                        רמה נמוכה
                      </h4>
                      <p className="text-xs text-blue-900/80 leading-relaxed">{info.low}</p>
                    </div>
                  </div>
                  
                  <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-2xl flex items-start gap-3">
                    <span className="material-symbols-outlined text-emerald-600 mt-0.5">check_circle</span>
                    <div>
                      <h4 className="font-bold text-emerald-800 text-sm mb-1">טווח נורמה רגיל</h4>
                      <p className="text-xs text-emerald-900/80" dir="ltr">{info.normal}</p>
                    </div>
                  </div>
                  
                  <div className="text-center pt-2">
                    <button 
                      onClick={closeMarkerModal}
                      className="bg-secondary/10 hover:bg-secondary/20 text-secondary font-bold px-6 py-2.5 rounded-full transition-all text-sm border-0 cursor-pointer"
                    >
                      הבנתי, תודה
                    </button>
                  </div>
                </div>
              ) : null}
              </div>
            </div>
          </div>
        );
      })()}

    </main>
  );
}
