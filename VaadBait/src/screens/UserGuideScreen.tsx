import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Card } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

interface GuideSection {
  id: string;
  title: string;
  icon: string;
  color: string;
  content: {
    subtitle: string;
    description: string;
  }[];
}

const guideSections: GuideSection[] = [
  {
    id: 'dashboard',
    title: 'מסך ראשי',
    icon: 'home',
    color: '#2196F3',
    content: [
      {
        subtitle: 'סקירה כללית',
        description: 'המסך הראשי מציג סיכום של כל הפעילות הכספית של ועד הבית. תוכל לראות את סך ההכנסות, ההוצאות והיתרה הנוכחית.',
      },
      {
        subtitle: 'ניווט מהיר',
        description: 'לחיצה על הכרטיסיות השונות תוביל אותך ישירות למסכי הניהול הרלוונטיים.',
      },
    ],
  },
  {
    id: 'residents',
    title: 'ניהול דיירים',
    icon: 'account-group',
    color: '#4CAF50',
    content: [
      {
        subtitle: 'הוספת דייר חדש',
        description: 'לחץ על כפתור ה-+ כדי להוסיף דייר חדש. מלא את הפרטים: שם, מספר דירה, טלפון, אימייל וסכום דמי ועד חודשיים.',
      },
      {
        subtitle: 'עריכת פרטי דייר',
        description: 'לחץ על כרטיס הדייר כדי לערוך את הפרטים שלו או למחוק אותו מהמערכת.',
      },
      {
        subtitle: 'סטטוס דייר',
        description: 'ניתן לסמן דייר כפעיל או לא פעיל. דיירים לא פעילים לא יופיעו ברשימת הגבייה.',
      },
    ],
  },
  {
    id: 'fee-collection',
    title: 'גביית דמי ועד',
    icon: 'cash-multiple',
    color: '#FF9800',
    content: [
      {
        subtitle: 'מעקב תשלומים',
        description: 'המסך מציג את כל הדיירים עם סטטוס התשלום שלהם לחודש הנבחר: שולם (ירוק), ממתין (כתום), או באיחור (אדום).',
      },
      {
        subtitle: 'רישום תשלום',
        description: 'לחץ על "רשום תשלום" או על ה-Chip של הסטטוס כדי לרשום תשלום עבור דייר.',
      },
      {
        subtitle: 'ביטול תשלום',
        description: 'אם נרשם תשלום בטעות, לחץ על הסטטוס הירוק "שולם" כדי לבטל את התשלום ולהחזיר לסטטוס ממתין.',
      },
      {
        subtitle: 'עריכת סכום ותאריך',
        description: 'לחץ על הסכום (ליד אייקון העיפרון) כדי לערוך את דמי הועד או את תאריך התשלום.',
      },
      {
        subtitle: 'שליחת תזכורת',
        description: 'לחץ על "תזכורת" כדי לשלוח הודעת WhatsApp לדייר עם תזכורת לתשלום.',
      },
    ],
  },
  {
    id: 'expenses',
    title: 'הוצאות הועד',
    icon: 'trending-down',
    color: '#f44336',
    content: [
      {
        subtitle: 'הוספת הוצאה',
        description: 'לחץ על כפתור ה-+ כדי להוסיף הוצאה חדשה. בחר קטגוריה, הזן סכום, תאריך ותיאור.',
      },
      {
        subtitle: 'צירוף קבלה',
        description: 'ניתן לצרף תמונה של הקבלה להוצאה לתיעוד ומעקב.',
      },
      {
        subtitle: 'עריכה ומחיקה',
        description: 'השתמש באייקונים בכרטיס ההוצאה כדי לערוך או למחוק.',
      },
    ],
  },
  {
    id: 'income',
    title: 'הכנסות הועד',
    icon: 'trending-up',
    color: '#4CAF50',
    content: [
      {
        subtitle: 'הוספת הכנסה',
        description: 'לחץ על כפתור ה-+ כדי להוסיף הכנסה חדשה שאינה דמי ועד (תרומות, שכירות וכו\').',
      },
      {
        subtitle: 'סטטוס תשלום',
        description: 'ניתן לסמן הכנסה כ"התקבל" או "ממתין" באמצעות הלחצנים בכרטיס.',
      },
    ],
  },
  {
    id: 'pending-payments',
    title: 'תשלומים צפויים',
    icon: 'clock-outline',
    color: '#FF9800',
    content: [
      {
        subtitle: 'מעקב תשלומים',
        description: 'מסך זה מרכז את כל התשלומים הצפויים מדיירים - דמי ועד, חשבונות טעינה ותשלומים אחרים.',
      },
      {
        subtitle: 'סינון',
        description: 'השתמש בפילטרים בחלק העליון כדי לסנן לפי סטטוס: הכל, ממתין, או התקבל.',
      },
      {
        subtitle: 'אישור קבלת תשלום',
        description: 'לחץ על "סמן כהתקבל" כדי לאשר שהתשלום התקבל.',
      },
    ],
  },
  {
    id: 'charging',
    title: 'טעינת חשמל',
    icon: 'flash',
    color: '#FFC107',
    content: [
      {
        subtitle: 'רישום קריאת מונה',
        description: 'בחר דייר, הזן את הקריאה הקודמת (מתמלא אוטומטית אם יש קריאה קודמת), הזן את הקריאה הנוכחית והמחיר לקוט"ש.',
      },
      {
        subtitle: 'חישוב אוטומטי',
        description: 'המערכת מחשבת אוטומטית את הצריכה והסכום לתשלום.',
      },
      {
        subtitle: 'צירוף תמונת מונה',
        description: 'ניתן לצרף תמונה של המונה לתיעוד.',
      },
      {
        subtitle: 'היסטוריית קריאות',
        description: 'לחץ על "היסטוריה" כדי לצפות בכל הקריאות הקודמות של הדייר.',
      },
    ],
  },
  {
    id: 'categories',
    title: 'ניהול קטגוריות',
    icon: 'tag-multiple',
    color: '#9C27B0',
    content: [
      {
        subtitle: 'הוספת קטגוריה',
        description: 'לחץ על כפתור ה-+ כדי להוסיף קטגוריה חדשה להוצאות או הכנסות.',
      },
      {
        subtitle: 'התאמה אישית',
        description: 'בחר צבע ואייקון לקטגוריה כדי לזהות אותה בקלות.',
      },
      {
        subtitle: 'עריכה ומחיקה',
        description: 'לחץ על קטגוריה קיימת כדי לערוך או למחוק אותה.',
      },
    ],
  },
  {
    id: 'reports',
    title: 'דוחות',
    icon: 'chart-bar',
    color: '#607D8B',
    content: [
      {
        subtitle: 'דוח חודשי',
        description: 'צפה בסיכום הכנסות והוצאות לפי חודש.',
      },
      {
        subtitle: 'דוח שנתי',
        description: 'צפה בסיכום כללי לכל השנה עם גרפים וניתוחים.',
      },
    ],
  },
  {
    id: 'email-alerts',
    title: 'התראות במייל',
    icon: 'email',
    color: '#E91E63',
    content: [
      {
        subtitle: 'סיכום חובות',
        description: 'לחץ על "סיכום חובות" בהגדרות כדי לראות את כל הדיירים עם חובות פתוחים.',
      },
      {
        subtitle: 'שליחת תזכורות',
        description: 'לחץ על "שלח תזכורות חוב" כדי לשלוח מייל סיכום לועד הבית.',
      },
      {
        subtitle: 'מיילים אוטומטיים',
        description: 'המערכת שולחת מיילים אוטומטיים ב-20 לכל חודש עם סיכום החובות.',
      },
    ],
  },
];

export default function UserGuideScreen({ navigation }: any) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const toggleSection = (sectionId: string) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId);
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-right" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>מדריך למשתמש</Text>
      </SafeAreaView>

      <ScrollView style={styles.content}>
        <Card style={styles.introCard}>
          <Card.Content>
            <Text style={styles.introTitle}>ברוכים הבאים לאפליקציית ועד בית!</Text>
            <Text style={styles.introText}>
              אפליקציה זו מיועדת לניהול כספי ועד הבית בצורה פשוטה ויעילה.
              לחץ על כל סעיף למטה כדי לקבל הסברים מפורטים.
            </Text>
          </Card.Content>
        </Card>

        {guideSections.map((section) => (
          <Card key={section.id} style={styles.sectionCard}>
            <TouchableOpacity onPress={() => toggleSection(section.id)}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <View style={[styles.iconCircle, { backgroundColor: section.color + '20' }]}>
                    <MaterialCommunityIcons
                      name={section.icon as any}
                      size={24}
                      color={section.color}
                    />
                  </View>
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                </View>
                <MaterialCommunityIcons
                  name={expandedSection === section.id ? 'chevron-up' : 'chevron-down'}
                  size={24}
                  color="#666"
                />
              </View>
            </TouchableOpacity>

            {expandedSection === section.id && (
              <View style={styles.sectionContent}>
                {section.content.map((item, index) => (
                  <View key={index} style={styles.contentItem}>
                    <Text style={[styles.contentSubtitle, { color: section.color }]}>
                      {item.subtitle}
                    </Text>
                    <Text style={styles.contentDescription}>{item.description}</Text>
                  </View>
                ))}
              </View>
            )}
          </Card>
        ))}

        <Card style={styles.tipsCard}>
          <Card.Content>
            <View style={styles.tipsHeader}>
              <MaterialCommunityIcons name="lightbulb-on" size={24} color="#FFC107" />
              <Text style={styles.tipsTitle}>טיפים שימושיים</Text>
            </View>
            <Text style={styles.tipText}>
              {'\u2022'} משוך למטה כדי לרענן את הנתונים בכל מסך
            </Text>
            <Text style={styles.tipText}>
              {'\u2022'} השתמש בחיצים בבורר החודשים כדי לעבור בין חודשים
            </Text>
            <Text style={styles.tipText}>
              {'\u2022'} צרף קבלות ותמונות לתיעוד מלא
            </Text>
            <Text style={styles.tipText}>
              {'\u2022'} הגדר קטגוריות מותאמות אישית לארגון טוב יותר
            </Text>
          </Card.Content>
        </Card>

        <View style={styles.spacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#9C27B0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginLeft: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'right',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  introCard: {
    backgroundColor: '#E8F5E9',
    marginBottom: 16,
  },
  introTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
    textAlign: 'right',
    marginBottom: 8,
  },
  introText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'right',
    lineHeight: 22,
  },
  sectionCard: {
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'right',
  },
  sectionContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  contentItem: {
    marginTop: 12,
  },
  contentSubtitle: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'right',
    marginBottom: 4,
  },
  contentDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'right',
    lineHeight: 22,
  },
  tipsCard: {
    backgroundColor: '#FFF8E1',
    marginTop: 8,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 12,
    gap: 8,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F57C00',
  },
  tipText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'right',
    marginBottom: 8,
    lineHeight: 22,
  },
  spacer: {
    height: 32,
  },
});
