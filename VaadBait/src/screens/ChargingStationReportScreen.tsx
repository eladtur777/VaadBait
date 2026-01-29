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

interface StationReportData {
  id: string;
  apartmentNumber: string;
  residentName: string;
  previousReading: number;
  currentReading: number;
  consumption: number;
  cost: number;
  isPaid: boolean;
}

export default function ChargingStationReportScreen({ navigation }: any) {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
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

  const handlePreviousMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  // Filter readings by selected month
  const filteredReadings = meterReadings.filter(r =>
    r.month === selectedMonth + 1 && r.year === selectedYear
  );

  // Build station report data
  const stationReportData: StationReportData[] = filteredReadings.map(reading => {
    const station = stations.find(s => s.id === reading.stationId);
    return {
      id: reading.id!,
      apartmentNumber: station?.apartmentNumber || '',
      residentName: station?.residentName || 'לא ידוע',
      previousReading: reading.previousReading,
      currentReading: reading.currentReading,
      consumption: reading.consumption,
      cost: reading.totalCost,
      isPaid: reading.isPaid,
    };
  });

  // Calculate totals
  const totalStations = stationReportData.length;
  const totalKwh = stationReportData.reduce((sum, s) => sum + s.consumption, 0);
  const totalCost = stationReportData.reduce((sum, s) => sum + s.cost, 0);
  const paidCount = stationReportData.filter(s => s.isPaid).length;
  const unpaidCount = totalStations - paidCount;

  const handleExportPDF = async () => {
    try {
      // Build stations HTML
      const stationsHtml = stationReportData.map((station, index) =>
        `<div class="station-section">
          <div class="station-title">${station.residentName} - דירה ${station.apartmentNumber}</div>
          <div class="usage-row">
            <span>קריאה קודמת:</span>
            <span>${station.previousReading.toFixed(2)} kWh</span>
          </div>
          <div class="usage-row">
            <span>קריאה נוכחית:</span>
            <span>${station.currentReading.toFixed(2)} kWh</span>
          </div>
          <div class="usage-row">
            <span>צריכה:</span>
            <span>${station.consumption.toFixed(2)} kWh</span>
          </div>
          <div class="usage-row">
            <span>תשלום:</span>
            <span>₪${station.cost.toFixed(2)}</span>
          </div>
          <div class="usage-row">
            <span>סטטוס:</span>
            <span style="color: ${station.isPaid ? '#4CAF50' : '#f44336'}">${station.isPaid ? 'שולם' : 'לא שולם'}</span>
          </div>
        </div>`
      ).join('');

      // Create HTML content for the charging station report PDF
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
                color: #FF6F00;
                text-align: center;
                margin-bottom: 10px;
              }
              h2 {
                color: #666;
                text-align: center;
                font-size: 18px;
                margin-bottom: 30px;
              }
              .summary-section {
                margin: 20px 0;
                padding: 15px;
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
                font-size: 16px;
              }
              .value {
                font-size: 16px;
              }
              .station-section {
                margin: 20px 0;
                padding: 15px;
                background-color: #fff;
                border: 1px solid #ddd;
                border-radius: 8px;
              }
              .station-title {
                font-size: 18px;
                font-weight: bold;
                margin-bottom: 10px;
                color: #333;
              }
              .usage-row {
                display: flex;
                justify-content: space-between;
                padding: 8px;
                border-bottom: 1px solid #eee;
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
            <h1>דוח עמדות טעינה</h1>
            <h2>${monthNames[selectedMonth]} ${selectedYear}</h2>

            <div class="summary-section">
              <div class="summary-row">
                <span class="label">סה"כ חשבונות:</span>
                <span class="value">${totalStations}</span>
              </div>
              <div class="summary-row">
                <span class="label">סה"כ קוט"ש:</span>
                <span class="value">${totalKwh.toFixed(2)} kWh</span>
              </div>
              <div class="summary-row">
                <span class="label">סה"כ תשלום:</span>
                <span class="value">₪${totalCost.toFixed(2)}</span>
              </div>
              <div class="summary-row">
                <span class="label">מחיר לקוט"ש:</span>
                <span class="value">₪${kwhPrice.toFixed(2)}</span>
              </div>
              <div class="summary-row">
                <span class="label">שולם:</span>
                <span class="value" style="color: #4CAF50">${paidCount}</span>
              </div>
              <div class="summary-row">
                <span class="label">לא שולם:</span>
                <span class="value" style="color: #f44336">${unpaidCount}</span>
              </div>
            </div>

            ${stationsHtml}

            <div class="footer">
              <p>נוצר באמצעות אפליקציית ועד בית</p>
              <p>תאריך: ${new Date().toLocaleDateString('he-IL')}</p>
            </div>
          </body>
        </html>
      `;

      if (Platform.OS === 'web') {
        // For web: open print dialog
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(html);
          printWindow.document.close();
          setTimeout(() => {
            printWindow.print();
          }, 250);
        }
      } else {
        // For mobile: use expo-print
        const { uri } = await Print.printToFileAsync({ html });

        // Share the PDF
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
      // Build data for Excel
      const data: any[][] = [
        ['דוח עמדות טעינה - ' + monthNames[selectedMonth] + ' ' + selectedYear],
        [],
        ['סיכום'],
        ['סה"כ חשבונות', totalStations],
        ['סה"כ קוט"ש', totalKwh.toFixed(2)],
        ['סה"כ תשלום', totalCost.toFixed(2)],
        ['מחיר לקוט"ש', kwhPrice.toFixed(2)],
        ['שולם', paidCount],
        ['לא שולם', unpaidCount],
        [],
        ['פירוט חשבונות'],
        ['דירה', 'שם', 'קריאה קודמת (kWh)', 'קריאה נוכחית (kWh)', 'צריכה (kWh)', 'תשלום (₪)', 'סטטוס'],
      ];

      stationReportData.forEach(station => {
        data.push([
          station.apartmentNumber,
          station.residentName,
          station.previousReading.toFixed(2),
          station.currentReading.toFixed(2),
          station.consumption.toFixed(2),
          station.cost.toFixed(2),
          station.isPaid ? 'שולם' : 'לא שולם'
        ]);
      });

      const ws = XLSX.utils.aoa_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'עמדות טעינה');

      if (Platform.OS === 'web') {
        const wbout = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
        const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `דוח_טעינה_${monthNames[selectedMonth]}_${selectedYear}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        const FileSystem = require('expo-file-system/legacy');
        const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
        const fileUri = FileSystem.documentDirectory + 'דוח_טעינה_' + Date.now() + '.xlsx';
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
        <ActivityIndicator size="large" color="#FF6F00" />
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
        <Text style={styles.title}>דוח עמדות טעינה</Text>
      </SafeAreaView>

      <ScrollView style={styles.content}>
        {/* Month Selector */}
        <Card style={styles.monthCard}>
          <Card.Content>
            <View style={styles.monthSelector}>
              <TouchableOpacity onPress={handleNextMonth}>
                <MaterialCommunityIcons name="chevron-left" size={32} color="#666" />
              </TouchableOpacity>
              <Text style={styles.monthText}>{monthNames[selectedMonth]} {selectedYear}</Text>
              <TouchableOpacity onPress={handlePreviousMonth}>
                <MaterialCommunityIcons name="chevron-right" size={32} color="#666" />
              </TouchableOpacity>
            </View>
          </Card.Content>
        </Card>

        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <Card style={[styles.summaryCard, styles.stationsCard]}>
            <Card.Content>
              <MaterialCommunityIcons name="ev-station" size={32} color="#FF6F00" />
              <Text style={styles.summaryLabel}>חשבונות</Text>
              <Text style={[styles.summaryAmount, { color: '#FF6F00' }]}>
                {totalStations}
              </Text>
            </Card.Content>
          </Card>

          <Card style={[styles.summaryCard, styles.kwhCard]}>
            <Card.Content>
              <MaterialCommunityIcons name="lightning-bolt" size={32} color="#FFC107" />
              <Text style={styles.summaryLabel}>קוט"ש</Text>
              <Text style={[styles.summaryAmount, { color: '#FFC107' }]}>
                {totalKwh.toFixed(1)}
              </Text>
            </Card.Content>
          </Card>

          <Card style={[styles.summaryCard, styles.costCard]}>
            <Card.Content>
              <MaterialCommunityIcons name="cash" size={32} color="#4CAF50" />
              <Text style={styles.summaryLabel}>תשלום</Text>
              <Text style={[styles.summaryAmount, { color: '#4CAF50' }]}>
                ₪{totalCost.toFixed(0)}
              </Text>
            </Card.Content>
          </Card>
        </View>

        {/* KWH Price Card */}
        <Card style={styles.priceCard}>
          <Card.Content>
            <Text style={styles.priceLabel}>מחיר קוט"ש נוכחי</Text>
            <Text style={styles.priceAmount}>₪{kwhPrice.toFixed(2)}</Text>
            <View style={styles.paymentStatus}>
              <Text style={styles.paidText}>שולם: {paidCount}</Text>
              <Text style={styles.unpaidText}>לא שולם: {unpaidCount}</Text>
            </View>
          </Card.Content>
        </Card>

        {/* Stations List */}
        {stationReportData.length > 0 ? (
          <Card style={styles.sectionCard}>
            <Card.Content>
              <Text style={styles.sectionTitle}>פירוט חשבונות</Text>
              {stationReportData.map((station) => (
                <View key={station.id} style={styles.stationRow}>
                  <View style={styles.stationInfo}>
                    <View style={[styles.apartmentBadge, !station.isPaid && styles.unpaidBadge]}>
                      <Text style={styles.apartmentNumber}>{station.apartmentNumber}</Text>
                    </View>
                    <View style={styles.stationNameContainer}>
                      <Text style={styles.stationName}>{station.residentName}</Text>
                      <Text style={[styles.statusText, station.isPaid ? styles.paidStatusText : styles.unpaidStatusText]}>
                        {station.isPaid ? 'שולם' : 'לא שולם'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.stationStats}>
                    <Text style={styles.kwhText}>{station.consumption.toFixed(2)} kWh</Text>
                    <Text style={styles.costText}>₪{station.cost.toFixed(2)}</Text>
                  </View>
                </View>
              ))}
            </Card.Content>
          </Card>
        ) : (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <Text style={styles.emptyText}>אין חשבונות בחודש זה</Text>
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
          >
            ייצא ל-PDF
          </Button>
          <Button
            mode="contained"
            icon="microsoft-excel"
            onPress={handleExportExcel}
            style={styles.exportButton}
            buttonColor="#217346"
          >
            ייצא ל-Excel
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
    backgroundColor: '#FF6F00',
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
  monthCard: {
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  monthSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  monthText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
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
  stationsCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF6F00',
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
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  summaryAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 4,
  },
  priceCard: {
    backgroundColor: '#FFF3E0',
    marginBottom: 16,
  },
  priceLabel: {
    fontSize: 14,
    color: '#E65100',
    textAlign: 'center',
    marginBottom: 8,
  },
  priceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#E65100',
    textAlign: 'center',
  },
  paymentStatus: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
    gap: 24,
  },
  paidText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
  },
  unpaidText: {
    fontSize: 14,
    color: '#f44336',
    fontWeight: '500',
  },
  emptyCard: {
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
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
  },
  stationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  stationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  apartmentBadge: {
    backgroundColor: '#FF6F00',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 12,
  },
  unpaidBadge: {
    backgroundColor: '#f44336',
  },
  apartmentNumber: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  stationNameContainer: {
    flex: 1,
  },
  stationName: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'right',
  },
  statusText: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 2,
  },
  paidStatusText: {
    color: '#4CAF50',
  },
  unpaidStatusText: {
    color: '#f44336',
  },
  stationStats: {
    alignItems: 'flex-start',
  },
  kwhText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  costText: {
    fontSize: 14,
    color: '#4CAF50',
    marginTop: 4,
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
