import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { Button, Card, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';
import {
  ChargingStationsService,
  MeterReadingsService,
  SettingsService,
  ChargingStation,
  MeterReading
} from '../services/firebaseService';

interface MonthlyData {
  month: string;
  monthIndex: number;
  totalKwh: number;
  totalCost: number;
  billCount: number;
  paidCount: number;
}

interface ResidentYearlyData {
  residentName: string;
  apartmentNumber: string;
  totalKwh: number;
  totalCost: number;
  billCount: number;
  paidCount: number;
}

export default function YearlyChargingStationReportScreen({ navigation }: any) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [stations, setStations] = useState<ChargingStation[]>([]);
  const [meterReadings, setMeterReadings] = useState<MeterReading[]>([]);
  const [kwhPrice, setKwhPrice] = useState(0.55);

  const monthNames = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
                      'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

  const loadData = async () => {
    try {
      const [stationsData, readingsData, settings] = await Promise.all([
        ChargingStationsService.getAll(),
        MeterReadingsService.getAll(),
        SettingsService.get(),
      ]);
      setStations(stationsData);
      setMeterReadings(readingsData);
      if (settings?.kwhPrice) {
        setKwhPrice(settings.kwhPrice);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      if (Platform.OS === 'web') {
        window.alert('לא ניתן לטעון את הנתונים');
      } else {
        Alert.alert('שגיאה', 'לא ניתן לטעון את הנתונים');
      }
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  // Get available years from data
  const getAvailableYears = () => {
    const years = new Set<number>();
    const currentYear = new Date().getFullYear();

    meterReadings.forEach(r => {
      years.add(r.year);
    });

    years.add(currentYear);
    return Array.from(years).sort((a, b) => b - a);
  };

  // Filter readings by selected year
  const yearReadings = meterReadings.filter(r => r.year === selectedYear);

  // Calculate monthly data
  const monthlyData: MonthlyData[] = monthNames.map((month, index) => {
    const monthReadings = yearReadings.filter(r => r.month === index + 1);
    return {
      month,
      monthIndex: index,
      totalKwh: monthReadings.reduce((sum, r) => sum + r.consumption, 0),
      totalCost: monthReadings.reduce((sum, r) => sum + r.totalCost, 0),
      billCount: monthReadings.length,
      paidCount: monthReadings.filter(r => r.isPaid).length,
    };
  });

  // Calculate resident yearly data
  const residentYearlyData: ResidentYearlyData[] = [];
  const stationMap = new Map<string, ResidentYearlyData>();

  yearReadings.forEach(reading => {
    const station = stations.find(s => s.id === reading.stationId);
    if (station) {
      const key = station.id!;
      if (!stationMap.has(key)) {
        stationMap.set(key, {
          residentName: station.residentName,
          apartmentNumber: station.apartmentNumber,
          totalKwh: 0,
          totalCost: 0,
          billCount: 0,
          paidCount: 0,
        });
      }
      const data = stationMap.get(key)!;
      data.totalKwh += reading.consumption;
      data.totalCost += reading.totalCost;
      data.billCount++;
      if (reading.isPaid) data.paidCount++;
    }
  });

  stationMap.forEach(data => residentYearlyData.push(data));
  residentYearlyData.sort((a, b) => b.totalCost - a.totalCost);

  // Calculate totals
  const totalKwh = yearReadings.reduce((sum, r) => sum + r.consumption, 0);
  const totalCost = yearReadings.reduce((sum, r) => sum + r.totalCost, 0);
  const totalBills = yearReadings.length;
  const paidBills = yearReadings.filter(r => r.isPaid).length;
  const unpaidBills = totalBills - paidBills;

  const handleExportPDF = async () => {
    try {
      // Build monthly breakdown HTML
      const monthlyHtml = monthlyData.map(m => `
        <tr>
          <td>${m.month}</td>
          <td>${m.billCount}</td>
          <td>${m.totalKwh.toFixed(2)} kWh</td>
          <td>₪${m.totalCost.toFixed(2)}</td>
          <td style="color: ${m.paidCount === m.billCount && m.billCount > 0 ? '#4CAF50' : '#f44336'}">
            ${m.paidCount}/${m.billCount}
          </td>
        </tr>
      `).join('');

      // Build residents breakdown HTML
      const residentsHtml = residentYearlyData.map(r => `
        <tr>
          <td>${r.apartmentNumber}</td>
          <td>${r.residentName}</td>
          <td>${r.totalKwh.toFixed(2)} kWh</td>
          <td>₪${r.totalCost.toFixed(2)}</td>
          <td style="color: ${r.paidCount === r.billCount ? '#4CAF50' : '#f44336'}">
            ${r.paidCount}/${r.billCount}
          </td>
        </tr>
      `).join('');

      const html = `
        <html dir="rtl">
          <head>
            <meta charset="utf-8">
            <style>
              body {
                font-family: Arial, sans-serif;
                padding: 20px;
                direction: rtl;
              }
              h1 {
                color: #9C27B0;
                text-align: center;
                margin-bottom: 10px;
              }
              h2 {
                color: #666;
                text-align: center;
                font-size: 18px;
                margin-bottom: 30px;
              }
              .summary {
                margin: 20px 0;
                padding: 20px;
                background-color: #f5f5f5;
                border-radius: 8px;
              }
              .summary-row {
                display: flex;
                justify-content: space-between;
                margin: 12px 0;
                padding: 10px;
                border-bottom: 1px solid #ddd;
              }
              .label {
                font-weight: bold;
              }
              .section {
                margin: 30px 0;
              }
              .section-title {
                font-size: 18px;
                font-weight: bold;
                margin-bottom: 15px;
                color: #333;
              }
              table {
                width: 100%;
                border-collapse: collapse;
              }
              th {
                background-color: #9C27B0;
                color: white;
                padding: 12px 8px;
                text-align: right;
              }
              td {
                padding: 10px 8px;
                border-bottom: 1px solid #eee;
                text-align: right;
              }
              tr:nth-child(even) {
                background-color: #f9f9f9;
              }
              .footer {
                margin-top: 40px;
                text-align: center;
                color: #666;
                font-size: 12px;
              }
            </style>
          </head>
          <body>
            <h1>דוח עמדות טעינה שנתי</h1>
            <h2>${selectedYear}</h2>

            <div class="summary">
              <div class="summary-row">
                <span class="label">סה"כ חשבונות:</span>
                <span>${totalBills}</span>
              </div>
              <div class="summary-row">
                <span class="label">סה"כ קוט"ש:</span>
                <span>${totalKwh.toFixed(2)} kWh</span>
              </div>
              <div class="summary-row">
                <span class="label">סה"כ הכנסות מטעינה:</span>
                <span style="color: #4CAF50; font-weight: bold;">₪${totalCost.toFixed(2)}</span>
              </div>
              <div class="summary-row">
                <span class="label">שולם:</span>
                <span style="color: #4CAF50;">${paidBills}</span>
              </div>
              <div class="summary-row">
                <span class="label">לא שולם:</span>
                <span style="color: #f44336;">${unpaidBills}</span>
              </div>
            </div>

            <div class="section">
              <div class="section-title">פירוט חודשי</div>
              <table>
                <thead>
                  <tr>
                    <th>חודש</th>
                    <th>חשבונות</th>
                    <th>צריכה</th>
                    <th>סכום</th>
                    <th>שולם/סה"כ</th>
                  </tr>
                </thead>
                <tbody>
                  ${monthlyHtml}
                </tbody>
              </table>
            </div>

            <div class="section">
              <div class="section-title">פירוט לפי דייר</div>
              <table>
                <thead>
                  <tr>
                    <th>דירה</th>
                    <th>שם</th>
                    <th>צריכה שנתית</th>
                    <th>סכום שנתי</th>
                    <th>שולם/סה"כ</th>
                  </tr>
                </thead>
                <tbody>
                  ${residentsHtml}
                </tbody>
              </table>
            </div>

            <div class="section" style="page-break-before: always;">
              <div class="section-title">פירוט מלא - כל הקריאות</div>
              <table>
                <thead>
                  <tr>
                    <th>חודש</th>
                    <th>דירה</th>
                    <th>שם</th>
                    <th>קריאה קודמת</th>
                    <th>קריאה נוכחית</th>
                    <th>צריכה</th>
                    <th>סכום</th>
                    <th>סטטוס</th>
                  </tr>
                </thead>
                <tbody>
                  ${yearReadings.map(r => {
                    const station = stations.find(s => s.id === r.stationId);
                    return `
                      <tr>
                        <td>${monthNames[r.month - 1]}</td>
                        <td>${station?.apartmentNumber || ''}</td>
                        <td>${station?.residentName || 'לא ידוע'}</td>
                        <td>${r.previousReading.toFixed(2)}</td>
                        <td>${r.currentReading.toFixed(2)}</td>
                        <td>${r.consumption.toFixed(2)} kWh</td>
                        <td>₪${r.totalCost.toFixed(2)}</td>
                        <td style="color: ${r.isPaid ? '#4CAF50' : '#f44336'}; font-weight: bold;">
                          ${r.isPaid ? 'שולם ✓' : 'לא שולם'}
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>

            <div class="footer">
              <p>נוצר באמצעות אפליקציית ועד בית</p>
              <p>תאריך הפקה: ${new Date().toLocaleDateString('he-IL')}</p>
            </div>
          </body>
        </html>
      `;

      if (Platform.OS === 'web') {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(html);
          printWindow.document.close();
          setTimeout(() => {
            printWindow.print();
          }, 250);
        }
      } else {
        const { uri } = await Print.printToFileAsync({ html });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            UTI: '.pdf',
            mimeType: 'application/pdf',
          });
        } else {
          if (Platform.OS === 'web') {
            window.alert('הדוח נשמר בהצלחה');
          } else {
            Alert.alert('הצלחה', 'הדוח נשמר בהצלחה');
          }
        }
      }
    } catch (error) {
      console.error('Error exporting PDF:', error);
      if (Platform.OS === 'web') {
        window.alert('אירעה שגיאה בייצוא הדוח ל-PDF');
      } else {
        Alert.alert('שגיאה', 'אירעה שגיאה בייצוא הדוח ל-PDF');
      }
    }
  };

  const handleExportExcel = async () => {
    try {
      const wb = XLSX.utils.book_new();

      // Summary sheet
      const summaryData = [
        [`דוח עמדות טעינה שנתי - ${selectedYear}`],
        [],
        ['סיכום שנתי'],
        ['סה"כ חשבונות', totalBills],
        ['סה"כ קוט"ש', totalKwh.toFixed(2)],
        ['סה"כ הכנסות', totalCost.toFixed(2)],
        ['שולם', paidBills],
        ['לא שולם', unpaidBills],
      ];
      const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summaryWs, 'סיכום');

      // Monthly breakdown sheet
      const monthlySheetData = [
        ['חודש', 'חשבונות', 'צריכה (kWh)', 'סכום (₪)', 'שולם', 'לא שולם'],
        ...monthlyData.map(m => [
          m.month,
          m.billCount,
          m.totalKwh.toFixed(2),
          m.totalCost.toFixed(2),
          m.paidCount,
          m.billCount - m.paidCount,
        ])
      ];
      const monthlyWs = XLSX.utils.aoa_to_sheet(monthlySheetData);
      XLSX.utils.book_append_sheet(wb, monthlyWs, 'פירוט חודשי');

      // Residents breakdown sheet
      const residentsSheetData = [
        ['דירה', 'שם', 'צריכה שנתית (kWh)', 'סכום שנתי (₪)', 'חשבונות', 'שולם', 'לא שולם'],
        ...residentYearlyData.map(r => [
          r.apartmentNumber,
          r.residentName,
          r.totalKwh.toFixed(2),
          r.totalCost.toFixed(2),
          r.billCount,
          r.paidCount,
          r.billCount - r.paidCount,
        ])
      ];
      const residentsWs = XLSX.utils.aoa_to_sheet(residentsSheetData);
      XLSX.utils.book_append_sheet(wb, residentsWs, 'פירוט לפי דייר');

      // Detailed readings sheet
      const detailedData = [
        ['חודש', 'דירה', 'שם', 'קריאה קודמת', 'קריאה נוכחית', 'צריכה (kWh)', 'סכום (₪)', 'סטטוס'],
        ...yearReadings.map(r => {
          const station = stations.find(s => s.id === r.stationId);
          return [
            monthNames[r.month - 1],
            station?.apartmentNumber || '',
            station?.residentName || 'לא ידוע',
            r.previousReading.toFixed(2),
            r.currentReading.toFixed(2),
            r.consumption.toFixed(2),
            r.totalCost.toFixed(2),
            r.isPaid ? 'שולם' : 'לא שולם',
          ];
        })
      ];
      const detailedWs = XLSX.utils.aoa_to_sheet(detailedData);
      XLSX.utils.book_append_sheet(wb, detailedWs, 'פירוט מלא');

      if (Platform.OS === 'web') {
        const wbout = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
        const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `דוח_טעינה_שנתי_${selectedYear}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        const FileSystem = require('expo-file-system/legacy');
        const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
        const fileUri = FileSystem.documentDirectory + `דוח_טעינה_שנתי_${selectedYear}_${Date.now()}.xlsx`;
        await FileSystem.writeAsStringAsync(fileUri, wbout, {
          encoding: FileSystem.EncodingType.Base64,
        });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            UTI: 'com.microsoft.excel.xlsx',
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          });
        } else {
          if (Platform.OS === 'web') {
            window.alert('הקובץ נשמר בהצלחה');
          } else {
            Alert.alert('הצלחה', 'הקובץ נשמר בהצלחה');
          }
        }
      }
    } catch (error) {
      console.error('Error exporting Excel:', error);
      if (Platform.OS === 'web') {
        window.alert('אירעה שגיאה בייצוא ל-Excel');
      } else {
        Alert.alert('שגיאה', 'אירעה שגיאה בייצוא ל-Excel');
      }
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#9C27B0" />
        <Text style={styles.loadingText}>טוען נתונים...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-right" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>דוח עמדות טעינה שנתי</Text>
      </SafeAreaView>

      <ScrollView style={styles.content}>
        {/* Year Selector */}
        <Card style={styles.yearCard}>
          <Card.Content>
            <View style={styles.yearSelector}>
              <TouchableOpacity onPress={() => setSelectedYear(selectedYear + 1)}>
                <MaterialCommunityIcons name="chevron-left" size={32} color="#666" />
              </TouchableOpacity>
              <Text style={styles.yearText}>{selectedYear}</Text>
              <TouchableOpacity onPress={() => setSelectedYear(selectedYear - 1)}>
                <MaterialCommunityIcons name="chevron-right" size={32} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Available Years Chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.yearsScrollView}>
              {getAvailableYears().map(year => (
                <TouchableOpacity
                  key={year}
                  style={[styles.yearChip, selectedYear === year && styles.yearChipSelected]}
                  onPress={() => setSelectedYear(year)}
                >
                  <Text style={[styles.yearChipText, selectedYear === year && styles.yearChipTextSelected]}>
                    {year}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Card.Content>
        </Card>

        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <Card style={[styles.summaryCard, styles.billsCard]}>
            <Card.Content>
              <MaterialCommunityIcons name="file-document-multiple" size={28} color="#9C27B0" />
              <Text style={styles.summaryLabel}>חשבונות</Text>
              <Text style={[styles.summaryAmount, { color: '#9C27B0' }]}>
                {totalBills}
              </Text>
            </Card.Content>
          </Card>

          <Card style={[styles.summaryCard, styles.kwhCard]}>
            <Card.Content>
              <MaterialCommunityIcons name="lightning-bolt" size={28} color="#FFC107" />
              <Text style={styles.summaryLabel}>קוט"ש</Text>
              <Text style={[styles.summaryAmount, { color: '#FFC107' }]}>
                {totalKwh.toFixed(0)}
              </Text>
            </Card.Content>
          </Card>

          <Card style={[styles.summaryCard, styles.costCard]}>
            <Card.Content>
              <MaterialCommunityIcons name="cash" size={28} color="#4CAF50" />
              <Text style={styles.summaryLabel}>הכנסות</Text>
              <Text style={[styles.summaryAmount, { color: '#4CAF50' }]}>
                ₪{totalCost.toFixed(0)}
              </Text>
            </Card.Content>
          </Card>
        </View>

        {/* Payment Status Card */}
        <Card style={styles.statusCard}>
          <Card.Content>
            <View style={styles.statusRow}>
              <View style={styles.statusItem}>
                <Text style={styles.statusLabel}>שולם</Text>
                <Text style={[styles.statusValue, { color: '#4CAF50' }]}>{paidBills}</Text>
              </View>
              <View style={styles.statusDivider} />
              <View style={styles.statusItem}>
                <Text style={styles.statusLabel}>לא שולם</Text>
                <Text style={[styles.statusValue, { color: '#f44336' }]}>{unpaidBills}</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Monthly Breakdown */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>פירוט חודשי</Text>
            {monthlyData.filter(m => m.billCount > 0).length > 0 ? (
              monthlyData.filter(m => m.billCount > 0).map((m) => (
                <View key={m.monthIndex} style={styles.monthRow}>
                  <View style={styles.monthInfo}>
                    <Text style={styles.monthName}>{m.month}</Text>
                    <Text style={styles.monthDetails}>
                      {m.billCount} חשבונות | {m.totalKwh.toFixed(1)} kWh
                    </Text>
                  </View>
                  <View style={styles.monthStats}>
                    <Text style={styles.monthCost}>₪{m.totalCost.toFixed(0)}</Text>
                    <Text style={[styles.monthPaid, m.paidCount === m.billCount ? styles.allPaid : styles.notAllPaid]}>
                      {m.paidCount}/{m.billCount}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>אין נתונים לשנה זו</Text>
            )}
          </Card.Content>
        </Card>

        {/* Residents Breakdown */}
        {residentYearlyData.length > 0 && (
          <Card style={styles.sectionCard}>
            <Card.Content>
              <Text style={styles.sectionTitle}>פירוט לפי דייר</Text>
              {residentYearlyData.map((r, index) => (
                <View key={index} style={styles.residentRow}>
                  <View style={styles.residentInfo}>
                    <View style={styles.apartmentBadge}>
                      <Text style={styles.apartmentNumber}>{r.apartmentNumber}</Text>
                    </View>
                    <View style={styles.residentDetails}>
                      <Text style={styles.residentName}>{r.residentName}</Text>
                      <Text style={styles.residentStats}>
                        {r.billCount} חשבונות | {r.totalKwh.toFixed(1)} kWh
                      </Text>
                    </View>
                  </View>
                  <View style={styles.residentCost}>
                    <Text style={styles.residentAmount}>₪{r.totalCost.toFixed(0)}</Text>
                    <Text style={[styles.residentPaid, r.paidCount === r.billCount ? styles.allPaid : styles.notAllPaid]}>
                      {r.paidCount}/{r.billCount}
                    </Text>
                  </View>
                </View>
              ))}
            </Card.Content>
          </Card>
        )}

        {/* Export Buttons */}
        <View style={styles.exportButtonsRow}>
          <Button
            mode="contained"
            icon="file-pdf-box"
            onPress={handleExportPDF}
            style={styles.exportButton}
            buttonColor="#f44336"
          >
            ייצא PDF
          </Button>
          <Button
            mode="contained"
            icon="microsoft-excel"
            onPress={handleExportExcel}
            style={styles.exportButton}
            buttonColor="#217346"
          >
            ייצא Excel
          </Button>
        </View>

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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
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
  yearCard: {
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  yearSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  yearText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#9C27B0',
    marginHorizontal: 24,
  },
  yearsScrollView: {
    flexDirection: 'row',
    marginTop: 8,
  },
  yearChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 4,
  },
  yearChipSelected: {
    backgroundColor: '#9C27B0',
  },
  yearChipText: {
    fontSize: 14,
    color: '#666',
  },
  yearChipTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  summaryRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
  },
  billsCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#9C27B0',
  },
  kwhCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
  },
  costCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
    marginTop: 6,
  },
  summaryAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 2,
  },
  statusCard: {
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusItem: {
    flex: 1,
    alignItems: 'center',
  },
  statusDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#eee',
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  sectionCard: {
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'right',
    color: '#333',
  },
  monthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  monthInfo: {
    flex: 1,
  },
  monthName: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'right',
  },
  monthDetails: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 2,
  },
  monthStats: {
    alignItems: 'flex-start',
  },
  monthCost: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  monthPaid: {
    fontSize: 12,
    marginTop: 2,
  },
  allPaid: {
    color: '#4CAF50',
  },
  notAllPaid: {
    color: '#f44336',
  },
  residentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  residentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  apartmentBadge: {
    backgroundColor: '#9C27B0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 10,
  },
  apartmentNumber: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  residentDetails: {
    flex: 1,
  },
  residentName: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'right',
  },
  residentStats: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 2,
  },
  residentCost: {
    alignItems: 'flex-start',
  },
  residentAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  residentPaid: {
    fontSize: 12,
    marginTop: 2,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    padding: 20,
  },
  exportButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  exportButton: {
    flex: 1,
  },
  spacer: {
    height: 32,
  },
});
