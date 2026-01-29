import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert, Platform } from 'react-native';
import { Card, Button, FAB, Chip, ActivityIndicator, Searchbar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import {
  MaintenanceTasksService,
  PeriodicMaintenanceService,
  MaintenanceTask,
  PeriodicMaintenance,
} from '../services/firebaseService';

type TabType = 'tasks' | 'periodic';
type StatusFilter = 'all' | 'open' | 'in_progress' | 'completed';

export default function MaintenanceScreen({ navigation }: any) {
  const [activeTab, setActiveTab] = useState<TabType>('tasks');
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [periodicMaintenance, setPeriodicMaintenance] = useState<PeriodicMaintenance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    try {
      const [tasksData, periodicData] = await Promise.all([
        MaintenanceTasksService.getAll(),
        PeriodicMaintenanceService.getAll(),
      ]);
      setTasks(tasksData);
      setPeriodicMaintenance(periodicData);
    } catch (error) {
      console.error('Error loading maintenance data:', error);
      if (Platform.OS === 'web') {
        window.alert('שגיאה בטעינת נתוני תחזוקה');
      } else {
        Alert.alert('שגיאה', 'לא ניתן לטעון את נתוני התחזוקה');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const filteredTasks = tasks.filter(task => {
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesSearch = task.title.includes(searchQuery) ||
                          task.description.includes(searchQuery) ||
                          (task.location && task.location.includes(searchQuery));
    return matchesStatus && matchesSearch;
  });

  const openTasks = tasks.filter(t => t.status === 'open').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;

  const upcomingMaintenance = periodicMaintenance.filter(m => {
    if (!m.isActive) return false;
    const daysUntil = Math.ceil((m.nextDue.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return daysUntil <= 30;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return '#FF9800';
      case 'in_progress': return '#2196F3';
      case 'completed': return '#4CAF50';
      case 'cancelled': return '#9E9E9E';
      default: return '#666';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'open': return 'פתוח';
      case 'in_progress': return 'בטיפול';
      case 'completed': return 'הושלם';
      case 'cancelled': return 'בוטל';
      default: return '';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return '#f44336';
      case 'high': return '#FF9800';
      case 'medium': return '#2196F3';
      case 'low': return '#4CAF50';
      default: return '#666';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'דחוף';
      case 'high': return 'גבוה';
      case 'medium': return 'בינוני';
      case 'low': return 'נמוך';
      default: return '';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'issue': return 'alert-circle';
      case 'improvement': return 'lightbulb';
      case 'general': return 'wrench';
      default: return 'clipboard-text';
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'issue': return 'תקלה';
      case 'improvement': return 'שיפור';
      case 'general': return 'כללי';
      default: return '';
    }
  };

  const getFrequencyText = (frequency: string) => {
    switch (frequency) {
      case 'weekly': return 'שבועי';
      case 'monthly': return 'חודשי';
      case 'quarterly': return 'רבעוני';
      case 'semi_annual': return 'חצי שנתי';
      case 'annual': return 'שנתי';
      default: return '';
    }
  };

  const getDaysUntil = (date: Date) => {
    const days = Math.ceil((date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    if (days < 0) return `באיחור של ${Math.abs(days)} ימים`;
    if (days === 0) return 'היום';
    if (days === 1) return 'מחר';
    return `בעוד ${days} ימים`;
  };

  const handleMarkAsPerformed = async (id: string) => {
    const confirmMsg = 'לסמן כבוצע? התאריך הבא יחושב אוטומטית.';
    if (Platform.OS === 'web') {
      if (window.confirm(confirmMsg)) {
        try {
          await PeriodicMaintenanceService.markAsPerformed(id);
          loadData();
        } catch (error) {
          window.alert('שגיאה בעדכון');
        }
      }
    } else {
      Alert.alert('אישור', confirmMsg, [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'סמן כבוצע',
          onPress: async () => {
            try {
              await PeriodicMaintenanceService.markAsPerformed(id);
              loadData();
            } catch (error) {
              Alert.alert('שגיאה', 'לא ניתן לעדכן');
            }
          },
        },
      ]);
    }
  };

  const handleQuickStatusChange = async (task: MaintenanceTask) => {
    const statusOptions = [
      { value: 'open', label: 'פתוח', color: '#FF9800' },
      { value: 'in_progress', label: 'בטיפול', color: '#2196F3' },
      { value: 'completed', label: 'הושלם', color: '#4CAF50' },
      { value: 'cancelled', label: 'בוטל', color: '#9E9E9E' },
    ];

    // Filter out current status
    const availableOptions = statusOptions.filter(opt => opt.value !== task.status);

    if (Platform.OS === 'web') {
      // For web, show a simple prompt with options
      const optionsText = availableOptions.map((opt, i) => `${i + 1}. ${opt.label}`).join('\n');
      const choice = window.prompt(`שנה סטטוס מ"${getStatusText(task.status)}" ל:\n${optionsText}\n\nהזן מספר (1-${availableOptions.length}):`);

      if (choice) {
        const index = parseInt(choice) - 1;
        if (index >= 0 && index < availableOptions.length) {
          const newStatus = availableOptions[index].value as MaintenanceTask['status'];
          try {
            const updateData: Partial<MaintenanceTask> = { status: newStatus };
            if (newStatus === 'completed') {
              updateData.completedAt = new Date();
            }
            await MaintenanceTasksService.update(task.id!, updateData);
            loadData();
            window.alert(`הסטטוס שונה ל"${availableOptions[index].label}"`);
          } catch (error) {
            console.error('Error updating status:', error);
            window.alert('שגיאה בעדכון הסטטוס');
          }
        }
      }
    } else {
      // For mobile, use Alert with buttons
      const buttons = availableOptions.map(opt => ({
        text: opt.label,
        onPress: async () => {
          try {
            const updateData: Partial<MaintenanceTask> = { status: opt.value as MaintenanceTask['status'] };
            if (opt.value === 'completed') {
              updateData.completedAt = new Date();
            }
            await MaintenanceTasksService.update(task.id!, updateData);
            loadData();
          } catch (error) {
            Alert.alert('שגיאה', 'לא ניתן לעדכן את הסטטוס');
          }
        },
      }));

      buttons.push({ text: 'ביטול', onPress: () => {} });

      Alert.alert('שנה סטטוס', `סטטוס נוכחי: ${getStatusText(task.status)}`, buttons);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#9C27B0" />
        <Text style={styles.loadingText}>טוען נתוני תחזוקה...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>ניהול תחזוקה</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'tasks' && styles.activeTab]}
          onPress={() => setActiveTab('tasks')}
        >
          <MaterialCommunityIcons
            name="clipboard-list"
            size={20}
            color={activeTab === 'tasks' ? '#9C27B0' : '#666'}
          />
          <Text style={[styles.tabText, activeTab === 'tasks' && styles.activeTabText]}>
            תקלות ומשימות
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'periodic' && styles.activeTab]}
          onPress={() => setActiveTab('periodic')}
        >
          <MaterialCommunityIcons
            name="calendar-clock"
            size={20}
            color={activeTab === 'periodic' ? '#9C27B0' : '#666'}
          />
          <Text style={[styles.tabText, activeTab === 'periodic' && styles.activeTabText]}>
            טיפולים תקופתיים
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {activeTab === 'tasks' ? (
          <>
            {/* Summary Cards */}
            <View style={styles.summaryGrid}>
              <TouchableOpacity
                style={{ flex: 1 }}
                onPress={() => setStatusFilter(statusFilter === 'open' ? 'all' : 'open')}
              >
                <Card style={[styles.summaryCard, statusFilter === 'open' && styles.summaryCardSelected]}>
                  <Card.Content>
                    <Text style={styles.summaryLabel}>פתוחים</Text>
                    <Text style={[styles.summaryValue, { color: '#FF9800' }]}>{openTasks}</Text>
                  </Card.Content>
                </Card>
              </TouchableOpacity>

              <TouchableOpacity
                style={{ flex: 1 }}
                onPress={() => setStatusFilter(statusFilter === 'in_progress' ? 'all' : 'in_progress')}
              >
                <Card style={[styles.summaryCard, statusFilter === 'in_progress' && styles.summaryCardSelected]}>
                  <Card.Content>
                    <Text style={styles.summaryLabel}>בטיפול</Text>
                    <Text style={[styles.summaryValue, { color: '#2196F3' }]}>{inProgressTasks}</Text>
                  </Card.Content>
                </Card>
              </TouchableOpacity>

              <TouchableOpacity
                style={{ flex: 1 }}
                onPress={() => setStatusFilter(statusFilter === 'completed' ? 'all' : 'completed')}
              >
                <Card style={[styles.summaryCard, statusFilter === 'completed' && styles.summaryCardSelected]}>
                  <Card.Content>
                    <Text style={styles.summaryLabel}>הושלמו</Text>
                    <Text style={[styles.summaryValue, { color: '#4CAF50' }]}>{completedTasks}</Text>
                  </Card.Content>
                </Card>
              </TouchableOpacity>
            </View>

            {/* Filter Indicator */}
            {statusFilter !== 'all' && (
              <TouchableOpacity onPress={() => setStatusFilter('all')} style={styles.filterIndicator}>
                <Text style={styles.filterIndicatorText}>
                  מציג: {getStatusText(statusFilter)}
                </Text>
                <MaterialCommunityIcons name="close-circle" size={20} color="#666" />
              </TouchableOpacity>
            )}

            {/* Search */}
            <Searchbar
              placeholder="חפש משימה..."
              onChangeText={setSearchQuery}
              value={searchQuery}
              style={styles.searchBar}
            />

            {/* Tasks List */}
            {filteredTasks.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Card.Content>
                  <MaterialCommunityIcons name="clipboard-check" size={48} color="#ccc" style={styles.emptyIcon} />
                  <Text style={styles.emptyText}>אין משימות</Text>
                  <Text style={styles.emptySubtext}>לחץ על + להוספת משימה חדשה</Text>
                </Card.Content>
              </Card>
            ) : (
              filteredTasks.map((task) => (
                <TouchableOpacity
                  key={task.id}
                  onPress={() => navigation.navigate('EditMaintenanceTask', { task })}
                >
                  <Card style={[styles.taskCard, { borderRightColor: getStatusColor(task.status) }]}>
                    <Card.Content>
                      <View style={styles.taskHeader}>
                        <View style={styles.taskTypeContainer}>
                          <View style={[styles.typeIcon, { backgroundColor: getPriorityColor(task.priority) + '20' }]}>
                            <MaterialCommunityIcons
                              name={getTypeIcon(task.type) as any}
                              size={20}
                              color={getPriorityColor(task.priority)}
                            />
                          </View>
                          <Chip
                            style={[styles.typeChip, { backgroundColor: '#f5f5f5' }]}
                            textStyle={{ fontSize: 10, color: '#666' }}
                          >
                            {getTypeText(task.type)}
                          </Chip>
                        </View>
                        <TouchableOpacity
                          onPress={(e) => {
                            e.stopPropagation();
                            handleQuickStatusChange(task);
                          }}
                        >
                          <Chip
                            style={[styles.statusChip, { backgroundColor: getStatusColor(task.status) + '20' }]}
                            textStyle={{ color: getStatusColor(task.status), fontSize: 11 }}
                            icon="chevron-down"
                          >
                            {getStatusText(task.status)}
                          </Chip>
                        </TouchableOpacity>
                      </View>

                      <Text style={styles.taskTitle}>{task.title}</Text>
                      <Text style={styles.taskDescription} numberOfLines={2}>{task.description}</Text>

                      <View style={styles.taskMeta}>
                        {task.location && (
                          <View style={styles.metaItem}>
                            <MaterialCommunityIcons name="map-marker" size={14} color="#999" />
                            <Text style={styles.metaText}>{task.location}</Text>
                          </View>
                        )}
                        <View style={styles.metaItem}>
                          <MaterialCommunityIcons name="flag" size={14} color={getPriorityColor(task.priority)} />
                          <Text style={[styles.metaText, { color: getPriorityColor(task.priority) }]}>
                            {getPriorityText(task.priority)}
                          </Text>
                        </View>
                        <Text style={styles.dateText}>
                          {task.createdAt?.toLocaleDateString('he-IL')}
                        </Text>
                      </View>
                    </Card.Content>
                  </Card>
                </TouchableOpacity>
              ))
            )}
          </>
        ) : (
          <>
            {/* Upcoming Maintenance Alert */}
            {upcomingMaintenance.length > 0 && (
              <Card style={styles.alertCard}>
                <Card.Content>
                  <View style={styles.alertHeader}>
                    <MaterialCommunityIcons name="bell-ring" size={24} color="#FF9800" />
                    <Text style={styles.alertTitle}>טיפולים קרובים ({upcomingMaintenance.length})</Text>
                  </View>
                  <Text style={styles.alertText}>
                    יש {upcomingMaintenance.length} טיפולים תקופתיים שמתקרבים ב-30 הימים הקרובים
                  </Text>
                </Card.Content>
              </Card>
            )}

            {/* Periodic Maintenance List */}
            {periodicMaintenance.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Card.Content>
                  <MaterialCommunityIcons name="calendar-clock" size={48} color="#ccc" style={styles.emptyIcon} />
                  <Text style={styles.emptyText}>אין טיפולים תקופתיים</Text>
                  <Text style={styles.emptySubtext}>לחץ על + להוספת טיפול תקופתי</Text>
                </Card.Content>
              </Card>
            ) : (
              periodicMaintenance.map((maintenance) => {
                const daysUntil = Math.ceil((maintenance.nextDue.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                const isOverdue = daysUntil < 0;
                const isUpcoming = daysUntil <= 7 && daysUntil >= 0;

                return (
                  <TouchableOpacity
                    key={maintenance.id}
                    onPress={() => navigation.navigate('EditPeriodicMaintenance', { maintenance })}
                  >
                    <Card style={[
                      styles.periodicCard,
                      isOverdue && styles.overdueCard,
                      isUpcoming && styles.upcomingCard,
                      !maintenance.isActive && styles.inactiveCard,
                    ]}>
                      <Card.Content>
                        <View style={styles.periodicHeader}>
                          <View style={styles.periodicInfo}>
                            <Text style={styles.periodicTitle}>{maintenance.title}</Text>
                            <Chip
                              style={styles.frequencyChip}
                              textStyle={{ fontSize: 10 }}
                            >
                              {getFrequencyText(maintenance.frequency)}
                            </Chip>
                          </View>
                          {!maintenance.isActive && (
                            <Chip style={styles.inactiveChip} textStyle={{ fontSize: 10, color: '#999' }}>
                              לא פעיל
                            </Chip>
                          )}
                        </View>

                        <Text style={styles.periodicDescription} numberOfLines={2}>
                          {maintenance.description}
                        </Text>

                        <View style={styles.periodicMeta}>
                          <View style={styles.dateContainer}>
                            <MaterialCommunityIcons
                              name="calendar"
                              size={16}
                              color={isOverdue ? '#f44336' : isUpcoming ? '#FF9800' : '#666'}
                            />
                            <Text style={[
                              styles.nextDueText,
                              isOverdue && styles.overdueText,
                              isUpcoming && styles.upcomingText,
                            ]}>
                              {getDaysUntil(maintenance.nextDue)}
                            </Text>
                          </View>
                          {maintenance.lastPerformed && (
                            <Text style={styles.lastPerformedText}>
                              בוצע לאחרונה: {maintenance.lastPerformed.toLocaleDateString('he-IL')}
                            </Text>
                          )}
                        </View>

                        {maintenance.isActive && (
                          <View style={styles.periodicActions}>
                            <Button
                              mode="contained"
                              onPress={() => handleMarkAsPerformed(maintenance.id!)}
                              style={styles.performedButton}
                              buttonColor="#4CAF50"
                              icon="check"
                              compact
                            >
                              סמן כבוצע
                            </Button>
                            {maintenance.reminderEmail && (
                              <View style={styles.reminderInfo}>
                                <MaterialCommunityIcons name="email" size={14} color="#2196F3" />
                                <Text style={styles.reminderText}>תזכורת פעילה</Text>
                              </View>
                            )}
                          </View>
                        )}
                      </Card.Content>
                    </Card>
                  </TouchableOpacity>
                );
              })
            )}
          </>
        )}

        <View style={styles.spacer} />
      </ScrollView>

      {/* FAB */}
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => {
          if (activeTab === 'tasks') {
            navigation.navigate('AddMaintenanceTask');
          } else {
            navigation.navigate('AddPeriodicMaintenance');
          }
        }}
        color="#fff"
      />
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
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'right',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: '#9C27B0',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
  },
  activeTabText: {
    color: '#9C27B0',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  summaryCard: {
    backgroundColor: '#fff',
  },
  summaryCardSelected: {
    borderWidth: 2,
    borderColor: '#9C27B0',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  filterIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3E5F5',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 12,
    gap: 8,
  },
  filterIndicatorText: {
    fontSize: 14,
    color: '#9C27B0',
    fontWeight: '500',
  },
  searchBar: {
    marginBottom: 16,
  },
  emptyCard: {
    backgroundColor: '#fff',
    padding: 20,
  },
  emptyIcon: {
    alignSelf: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
  },
  taskCard: {
    backgroundColor: '#fff',
    marginBottom: 12,
    borderRightWidth: 4,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  taskTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeChip: {
    height: 24,
  },
  statusChip: {
    height: 24,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'right',
    marginBottom: 4,
  },
  taskDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'right',
    marginBottom: 8,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#999',
  },
  dateText: {
    fontSize: 12,
    color: '#999',
  },
  alertCard: {
    backgroundColor: '#FFF3E0',
    marginBottom: 16,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginBottom: 8,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF9800',
  },
  alertText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'right',
  },
  periodicCard: {
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  overdueCard: {
    borderWidth: 1,
    borderColor: '#f44336',
    backgroundColor: '#FFEBEE',
  },
  upcomingCard: {
    borderWidth: 1,
    borderColor: '#FF9800',
    backgroundColor: '#FFF8E1',
  },
  inactiveCard: {
    opacity: 0.6,
  },
  periodicHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  periodicInfo: {
    flex: 1,
  },
  periodicTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'right',
    marginBottom: 4,
  },
  frequencyChip: {
    alignSelf: 'flex-end',
    backgroundColor: '#E1BEE7',
    height: 24,
  },
  inactiveChip: {
    backgroundColor: '#f5f5f5',
    height: 24,
  },
  periodicDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'right',
    marginBottom: 12,
  },
  periodicMeta: {
    marginBottom: 12,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginBottom: 4,
  },
  nextDueText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  overdueText: {
    color: '#f44336',
  },
  upcomingText: {
    color: '#FF9800',
  },
  lastPerformedText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
  },
  periodicActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
  },
  performedButton: {
    flex: 0,
  },
  reminderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reminderText: {
    fontSize: 12,
    color: '#2196F3',
  },
  spacer: {
    height: 80,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#9C27B0',
  },
});
