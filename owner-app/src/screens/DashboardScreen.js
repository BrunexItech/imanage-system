import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import { ownerAPI, webSocketService } from '../services/api';
import notificationService from '../services/notificationService';
import { LineChart, PieChart } from 'react-native-chart-kit';

const DashboardScreen = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [aiSummaries, setAiSummaries] = useState([]);
  const [salesTrend, setSalesTrend] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [liveSales, setLiveSales] = useState([]);
  const [expenseData, setExpenseData] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [notificationPermission, setNotificationPermission] = useState(false);
  const [webSocketStatus, setWebSocketStatus] = useState('disconnected');
  const [liveSalePulse, setLiveSalePulse] = useState(new Animated.Value(0));
  const wsRef = useRef(null);

  const screenWidth = Dimensions.get('window').width;

  useEffect(() => {
    loadDashboard();
    loadAiSummaries();
    loadSalesTrend();
    setupWebSocket();
    initializeNotifications();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.disconnect();
      }
      notificationService.destroy();
    };
  }, []);

  useEffect(() => {
    // Pulse animation for new sales
    if (liveSales.length > 0) {
      Animated.sequence([
        Animated.timing(liveSalePulse, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(liveSalePulse, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [liveSales.length]);

  const initializeNotifications = async () => {
    try {
      const initialized = await notificationService.initialize();
      setNotificationPermission(initialized);
      
      if (initialized) {
        const unsubscribe = notificationService.subscribe((notification) => {
          handleIncomingNotification(notification);
        });
        
        try {
          const response = await ownerAPI.getAiSummaries();
          setUnreadNotifications(response.data.unread_notifications || 0);
        } catch (error) {
          console.error('Failed to get notification count:', error);
        }
        
        return unsubscribe;
      }
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
      setNotificationPermission(false);
    }
  };

  const handleIncomingNotification = (notification) => {
    if (notification.data?.type === 'sale') {
      const newSale = {
        receipt_number: notification.data.receipt_number || 'N/A',
        total_amount: notification.data.amount || '0',
        created_at: notification.data.timestamp || new Date().toISOString(),
        is_new: true,
      };
      
      setLiveSales(prev => {
        const updated = [newSale, ...prev.slice(0, 8)];
        return updated;
      });
      
      setTimeout(() => {
        loadDashboard();
      }, 1000);
    }
    
    if (notification.notification && notification.data?.type !== 'sale') {
      Alert.alert(
        notification.notification.title || 'Imanage AI',
        notification.notification.body || 'New notification',
        [
          { text: 'OK', onPress: () => {} },
          { 
            text: 'View Details', 
            onPress: () => handleNotificationAction(notification.data) 
          }
        ]
      );
    }
  };

  const setupWebSocket = () => {
    const businessId = 1;
    
    setWebSocketStatus('connecting');
    
    wsRef.current = webSocketService.connect(
      businessId,
      (data) => {
        console.log('WebSocket message:', data);
        setWebSocketStatus('connected');
        
        if (data.type === 'new_sale') {
          const animatedSale = {
            ...data.sale,
            is_new: true,
            animated: true,
          };
          
          setLiveSales(prev => {
            const updated = [animatedSale, ...prev.slice(0, 8)];
            return updated;
          });
          
          loadDashboard();
          
          setTimeout(() => {
            setLiveSales(prev => prev.map(sale => ({
              ...sale,
              is_new: false,
              animated: false,
            })));
          }, 3000);
        }
      },
      (error) => {
        console.error('WebSocket error:', error);
        setWebSocketStatus('disconnected');
        
        setTimeout(() => {
          if (wsRef.current) {
            wsRef.current.disconnect();
            setupWebSocket();
          }
        }, 5000);
      }
    );
  };

  const loadDashboard = async () => {
    try {
      setRefreshing(true);
      const response = await ownerAPI.getDashboard();
      setDashboardData(response.data);
      
      const simulatedExpenses = [
        { name: 'Supplies', amount: response.data.today_expenses * 0.4, color: '#FF6B6B', legendFontColor: '#7F7F7F' },
        { name: 'Utilities', amount: response.data.today_expenses * 0.3, color: '#4ECDC4', legendFontColor: '#7F7F7F' },
        { name: 'Salaries', amount: response.data.today_expenses * 0.2, color: '#45B7D1', legendFontColor: '#7F7F7F' },
        { name: 'Other', amount: response.data.today_expenses * 0.1, color: '#96CEB4', legendFontColor: '#7F7F7F' },
      ];
      setExpenseData(simulatedExpenses);
    } catch (error) {
      Alert.alert('Error', 'Failed to load dashboard');
      console.error(error);
    } finally {
      setRefreshing(false);
    }
  };

  const loadAiSummaries = async () => {
    try {
      const response = await ownerAPI.getAiSummaries();
      setAiSummaries(response.data.summaries || []);
      setUnreadNotifications(response.data.unread_notifications || 0);
    } catch (error) {
      console.error('Failed to load AI summaries:', error);
    }
  };

  const loadSalesTrend = async () => {
    try {
      const response = await ownerAPI.getSalesTrend();
      setSalesTrend(response.data.daily_sales || []);
    } catch (error) {
      console.error('Failed to load sales trend:', error);
    }
  };

  const generateAiSummary = async () => {
    try {
      Alert.alert('Generating', 'AI summary is being generated...');
      await ownerAPI.generateAiSummary(new Date().toISOString().split('T')[0]);
      loadAiSummaries();
      Alert.alert('Success', 'AI summary generated');
    } catch (error) {
      Alert.alert('Error', 'Failed to generate AI summary');
    }
  };

  const calculatePrediction = () => {
    if (!salesTrend.length || !dashboardData) return 0;
    
    const last3Days = salesTrend.slice(-3);
    if (last3Days.length < 2) return 0;
    
    const total = last3Days.reduce((sum, day) => sum + (parseFloat(day.total) || 0), 0);
    return total / last3Days.length;
  };

  const handleNotificationSettings = () => {
    Alert.alert(
      'Notification Settings',
      `Notifications are ${notificationPermission ? 'ENABLED' : 'DISABLED'}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: notificationPermission ? 'Disable' : 'Enable', 
          onPress: async () => {
            if (notificationPermission) {
              notificationService.destroy();
              setNotificationPermission(false);
            } else {
              await initializeNotifications();
            }
          }
        }
      ]
    );
  };

  const getWebSocketStatusIcon = () => {
    switch (webSocketStatus) {
      case 'connected': return { icon: '🌐', color: '#4CAF50', text: 'Live' };
      case 'connecting': return { icon: '🔄', color: '#FF9800', text: 'Connecting' };
      default: return { icon: '📡', color: '#F44336', text: 'Disconnected' };
    }
  };

  const getSaleImpactLevel = (amount) => {
    if (amount > 5000) return { level: 'high', label: 'MAJOR', color: '#4CAF50', icon: '💰' };
    if (amount > 1000) return { level: 'medium', label: 'GOOD', color: '#2196F3', icon: '💵' };
    return { level: 'normal', label: 'NORMAL', color: '#9C27B0', icon: '🛒' };
  };

  if (!dashboardData) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ fontSize: 60 }}>📈</Text>
        <Text style={styles.loadingText}>Loading Business Intelligence...</Text>
      </View>
    );
  }

  const chartData = {
    labels: salesTrend.slice(-7).map(day => {
      const date = new Date(day.created_at__date);
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    }),
    datasets: [{
      data: salesTrend.slice(-7).map(day => parseFloat(day.total) || 0),
      color: (opacity = 1) => `rgba(25, 118, 210, ${opacity})`,
      strokeWidth: 3
    }]
  };

  const prediction = calculatePrediction();
  const profitMargin = dashboardData.today_sales > 0 
    ? ((dashboardData.today_profit / dashboardData.today_sales) * 100).toFixed(1)
    : 0;
  
  const wsStatus = getWebSocketStatusIcon();
  const pulseAnimation = {
    transform: [{
      scale: liveSalePulse.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.1]
      })
    }]
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={loadDashboard} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerMain}>
          <View>
            <Text style={styles.title}>Imanage AI Dashboard</Text>
            <Text style={styles.subtitle}>Real-time Business Intelligence</Text>
          </View>
          
          <View style={styles.headerControls}>
            <TouchableOpacity 
              onPress={handleNotificationSettings}
              style={styles.notificationControl}
            >
              <View style={styles.badgeContainer}>
                <Text style={{ fontSize: 24 }}>🔔</Text>
                {unreadNotifications > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {unreadNotifications > 9 ? '9+' : unreadNotifications}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.controlStatus}>
                {notificationPermission ? 'ON' : 'OFF'}
              </Text>
            </TouchableOpacity>
            
            <View style={[styles.wsStatus, { backgroundColor: wsStatus.color + '20' }]}>
              <Text style={[styles.wsStatusText, { color: wsStatus.color }]}>
                {wsStatus.icon} {wsStatus.text}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Key Metrics Row */}
      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>KES {dashboardData.today_sales.toLocaleString()}</Text>
          <Text style={styles.metricLabel}>Today's Revenue</Text>
          {prediction > 0 && (
            <View style={styles.trendIndicator}>
              <Text style={{ fontSize: 12, color: '#4CAF50' }}>📈</Text>
              <Text style={styles.trendText}>KES {prediction.toFixed(0)} predicted</Text>
            </View>
          )}
        </View>
        
        <View style={styles.metricCard}>
          <Text style={[
            styles.metricValue, 
            dashboardData.today_profit > 0 ? styles.profitPositive : styles.profitNegative
          ]}>
            KES {dashboardData.today_profit.toLocaleString()}
          </Text>
          <Text style={styles.metricLabel}>Net Profit</Text>
          <View style={styles.profitMargin}>
            <Text style={styles.marginText}>{profitMargin}% margin</Text>
          </View>
        </View>
      </View>

      {/* Live Sales Section */}
      <Animated.View style={[styles.liveSalesSection, pulseAnimation]}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Text style={{ fontSize: 20, color: '#FF9800' }}>⚡</Text>
            <Text style={styles.sectionTitle}>Live Sales Feed</Text>
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>
          
          <TouchableOpacity onPress={() => setLiveSales([])}>
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        </View>
        
        {liveSales.length > 0 ? (
          <View style={styles.liveSalesContainer}>
            {liveSales.slice(0, 5).map((sale, index) => {
              const impact = getSaleImpactLevel(parseFloat(sale.total_amount));
              const isNew = sale.is_new || sale.animated;
              
              return (
                <Animated.View 
                  key={`${sale.receipt_number}-${index}`}
                  style={[
                    styles.liveSaleCard,
                    isNew && styles.newSaleCard,
                    { borderLeftColor: impact.color }
                  ]}
                >
                  <View style={styles.saleInfo}>
                    <View>
                      <View style={styles.saleHeader}>
                        <Text style={styles.saleReceipt}>{sale.receipt_number}</Text>
                        {isNew && (
                          <View style={styles.newBadge}>
                            <Text style={styles.newBadgeText}>NEW</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.saleTime}>
                        {new Date(sale.created_at).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </Text>
                    </View>
                    
                    <View style={styles.saleAmountContainer}>
                      <Text style={styles.saleAmount}>KES {sale.total_amount}</Text>
                      <View style={[styles.impactTag, { backgroundColor: impact.color + '20' }]}>
                        <Text style={[styles.impactText, { color: impact.color }]}>
                          {impact.icon} {impact.label}
                        </Text>
                      </View>
                    </View>
                  </View>
                  
                  {index === 0 && liveSales.length > 0 && (
                    <View style={styles.latestSaleIndicator}>
                      <Text style={{ fontSize: 14, color: '#4CAF50' }}>⬆️</Text>
                      <Text style={styles.latestSaleText}>Latest Sale</Text>
                    </View>
                  )}
                </Animated.View>
              );
            })}
          </View>
        ) : (
          <View style={styles.noSales}>
            <Text style={{ fontSize: 40, color: '#E0E0E0' }}>🛒</Text>
            <Text style={styles.noSalesText}>Waiting for sales...</Text>
            <Text style={styles.noSalesSubtext}>Sales will appear here in real-time</Text>
          </View>
        )}
        
        <View style={styles.statsFooter}>
          <Text style={styles.statsText}>
            {liveSales.length} sales • {dashboardData.today_transactions} today • 
            Avg: KES {(dashboardData.today_sales / dashboardData.today_transactions || 0).toFixed(0)}
          </Text>
        </View>
      </Animated.View>

      {/* Performance Charts */}
      <View style={styles.chartsSection}>
        <Text style={styles.sectionTitle}>7-Day Performance</Text>
        {salesTrend.length > 0 ? (
          <LineChart
            data={chartData}
            width={screenWidth - 40}
            height={220}
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#ffffff',
              backgroundGradientTo: '#ffffff',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(25, 118, 210, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              style: {
                borderRadius: 16
              },
              propsForDots: {
                r: '6',
                strokeWidth: '2',
                stroke: '#1976d2'
              }
            }}
            bezier
            style={styles.chart}
            formatYLabel={(value) => `KES${parseInt(value).toLocaleString()}`}
          />
        ) : (
          <View style={styles.noChartData}>
            <Text style={styles.noChartText}>No sales data available</Text>
          </View>
        )}
      </View>

      {/* AI Insights */}
      <View style={styles.aiSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>AI Business Insights</Text>
          <TouchableOpacity onPress={generateAiSummary} style={styles.aiGenerateButton}>
            <Text style={{ fontSize: 16, color: 'white' }}>✨</Text>
            <Text style={styles.aiGenerateText}>Generate</Text>
          </TouchableOpacity>
        </View>
        
        {aiSummaries.length > 0 ? (
          <View style={styles.aiInsights}>
            <View style={styles.aiMainCard}>
              <View style={styles.aiCardHeader}>
                <Text style={styles.aiDate}>
                  {new Date(aiSummaries[0].date).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </Text>
                <View style={[
                  styles.aiStatus, 
                  aiSummaries[0].insights?.profitability === 'good' ? 
                    styles.statusGood : styles.statusWarning
                ]}>
                  <Text style={{ fontSize: 14, color: 'white' }}>
                    {aiSummaries[0].insights?.profitability === 'good' ? '✅' : '⚠️'}
                  </Text>
                  <Text style={styles.aiStatusText}>
                    {aiSummaries[0].insights?.profitability === 'good' ? 'Profitable' : 'Needs Attention'}
                  </Text>
                </View>
              </View>
              
              <Text style={styles.aiSummary} numberOfLines={4}>
                {aiSummaries[0].ai_summary}
              </Text>
              
              <TouchableOpacity 
                onPress={() => Alert.alert('Full AI Analysis', aiSummaries[0].ai_summary)}
                style={styles.readMoreButton}
              >
                <Text style={styles.readMoreText}>Read Full Analysis</Text>
                <Text style={{ fontSize: 16, color: '#1976d2' }}>→</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.noAiData}>
            <Text style={{ fontSize: 40, color: '#E0E0E0' }}>📊</Text>
            <Text style={styles.noAiText}>No AI insights yet</Text>
            <TouchableOpacity onPress={generateAiSummary} style={styles.generateFirstButton}>
              <Text style={styles.generateFirstText}>Generate First Insight</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Quick Stats */}
      <View style={styles.quickStats}>
        <View style={styles.statItem}>
          <Text style={{ fontSize: 24, color: '#FF9800' }}>📦</Text>
          <Text style={styles.statNumber}>{dashboardData.low_stock_items}</Text>
          <Text style={styles.statLabel}>Low Stock</Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={{ fontSize: 24, color: '#2196F3' }}>🧾</Text>
          <Text style={styles.statNumber}>{dashboardData.today_transactions}</Text>
          <Text style={styles.statLabel}>Transactions</Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={{ fontSize: 24, color: '#4CAF50' }}>📊</Text>
          <Text style={styles.statNumber}>{profitMargin}%</Text>
          <Text style={styles.statLabel}>Profit Margin</Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={{ fontSize: 24, color: '#9C27B0' }}>💰</Text>
          <Text style={styles.statNumber}>
            KES {dashboardData.today_gross_profit ? 
              Math.floor(dashboardData.today_gross_profit / 1000) + 'K' : '0'}
          </Text>
          <Text style={styles.statLabel}>Gross Profit</Text>
        </View>
      </View>

      {/* System Status - Improved spacing */}
      <View style={styles.systemStatus}>
        <Text style={styles.statusTitle}>System Status</Text>
        <View style={styles.statusItems}>
          <View style={[styles.statusItem, styles.statusItemSpaced]}>
            <Text style={{ fontSize: 18, color: notificationPermission ? '#4CAF50' : '#F44336' }}>
              {notificationPermission ? '🔔' : '🔕'}
            </Text>
            <Text style={styles.statusText}>
              Notifications: {notificationPermission ? 'Active' : 'Inactive'}
            </Text>
          </View>
          
          <View style={[styles.statusItem, styles.statusItemSpaced]}>
            <Text style={{ fontSize: 18, color: webSocketStatus === 'connected' ? '#4CAF50' : '#F44336' }}>
              {webSocketStatus === 'connected' ? '🌐' : '📡'}
            </Text>
            <Text style={styles.statusText}>
              Live Feed: {webSocketStatus === 'connected' ? 'Connected' : 'Disconnected'}
            </Text>
          </View>
        </View>
      </View>

      {/* Bottom Spacing */}
      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  header: {
    padding: 20,
    backgroundColor: '#1976d2',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },
  headerControls: {
    alignItems: 'flex-end',
  },
  notificationControl: {
    alignItems: 'center',
    marginBottom: 10,
  },
  badgeContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 9,
    fontWeight: 'bold',
  },
  controlStatus: {
    fontSize: 10,
    color: 'white',
    marginTop: 4,
    fontWeight: '600',
  },
  wsStatus: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  wsStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  metricsRow: {
    flexDirection: 'row',
    padding: 15,
    paddingTop: 20,
  },
  metricCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 15,
    marginHorizontal: 5,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 5,
  },
  profitPositive: {
    color: '#4CAF50',
  },
  profitNegative: {
    color: '#F44336',
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  trendIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  trendText: {
    fontSize: 10,
    color: '#666',
    marginLeft: 4,
  },
  profitMargin: {
    marginTop: 5,
  },
  marginText: {
    fontSize: 10,
    color: '#4CAF50',
    fontWeight: '500',
  },
  liveSalesSection: {
    backgroundColor: 'white',
    margin: 15,
    marginTop: 5,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 10,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F44336',
    marginRight: 5,
  },
  liveText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#F44336',
  },
  clearText: {
    fontSize: 12,
    color: '#1976d2',
    fontWeight: '600',
  },
  liveSalesContainer: {
    marginBottom: 10,
  },
  liveSaleCard: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  newSaleCard: {
    backgroundColor: '#f0f7ff',
    borderLeftWidth: 4,
  },
  saleInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  saleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  saleReceipt: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  newBadge: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  newBadgeText: {
    fontSize: 9,
    color: 'white',
    fontWeight: 'bold',
  },
  saleTime: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  saleAmountContainer: {
    alignItems: 'flex-end',
  },
  saleAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 4,
  },
  impactTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  impactText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  latestSaleIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e8f4ff',
  },
  latestSaleText: {
    fontSize: 10,
    color: '#4CAF50',
    fontWeight: '600',
    marginLeft: 4,
  },
  noSales: {
    padding: 30,
    alignItems: 'center',
  },
  noSalesText: {
    color: '#888',
    fontSize: 14,
    marginTop: 10,
  },
  noSalesSubtext: {
    color: '#aaa',
    fontSize: 12,
    marginTop: 5,
  },
  statsFooter: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  statsText: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
  },
  chartsSection: {
    backgroundColor: 'white',
    margin: 15,
    marginTop: 5,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  noChartData: {
    padding: 30,
    alignItems: 'center',
  },
  noChartText: {
    color: '#888',
    fontSize: 14,
  },
  aiSection: {
    backgroundColor: 'white',
    margin: 15,
    marginTop: 5,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  aiGenerateButton: {
    backgroundColor: '#1976d2',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  aiGenerateText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
    marginLeft: 5,
  },
  aiInsights: {
    marginTop: 10,
  },
  aiMainCard: {
    backgroundColor: '#f0f7ff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1e3ff',
  },
  aiCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  aiDate: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1976d2',
  },
  aiStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusGood: {
    backgroundColor: '#4CAF50',
  },
  statusWarning: {
    backgroundColor: '#FF9800',
  },
  aiStatusText: {
    fontSize: 11,
    color: 'white',
    fontWeight: '600',
    marginLeft: 4,
  },
  aiSummary: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 15,
  },
  readMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  readMoreText: {
    color: '#1976d2',
    fontWeight: '600',
    fontSize: 13,
    marginRight: 5,
  },
  noAiData: {
    padding: 30,
    alignItems: 'center',
  },
  noAiText: {
    color: '#888',
    fontSize: 14,
    marginTop: 10,
    marginBottom: 15,
  },
  generateFirstButton: {
    backgroundColor: '#1976d2',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  generateFirstText: {
    color: 'white',
    fontWeight: '600',
  },
  quickStats: {
    flexDirection: 'row',
    padding: 15,
    paddingTop: 5,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    margin: 5,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976d2',
    marginTop: 5,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
  },
  systemStatus: {
    backgroundColor: 'white',
    margin: 15,
    marginTop: 5,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  statusItems: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusItemSpaced: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    flex: 1,
    marginHorizontal: 5,
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  bottomSpacing: {
    height: 20,
  },
});

export default DashboardScreen;