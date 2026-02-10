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
} from 'react-native';
import { ownerAPI, webSocketService } from '../services/api';
import notificationService from '../services/notificationService'; // Import notification service
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
      // Cleanup notification service
      notificationService.destroy();
    };
  }, []);

  const initializeNotifications = async () => {
    try {
      const initialized = await notificationService.initialize();
      setNotificationPermission(initialized);
      
      if (initialized) {
        // Subscribe to notifications
        const unsubscribe = notificationService.subscribe((notification) => {
          console.log('Received notification:', notification);
          
          // Handle notification based on type
          if (notification.data?.type === 'sale') {
            // Add to live sales
            const newSale = {
              receipt_number: notification.data.receipt_number || 'N/A',
              total_amount: notification.data.amount || '0',
              created_at: notification.data.timestamp || new Date().toISOString(),
            };
            setLiveSales(prev => [newSale, ...prev.slice(0, 9)]);
            
            // Refresh dashboard for updated stats
            setTimeout(() => {
              loadDashboard();
            }, 1000);
          }
          
          // Show alert for important notifications
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
        });
        
        // Get initial unread count
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

  const handleNotificationAction = (data) => {
    if (!data) return;
    
    const { type, sale_id, product_id, summary_id } = data;
    
    switch (type) {
      case 'sale':
        Alert.alert(
          'Sale Details',
          `Receipt: ${data.receipt_number || 'N/A'}\nAmount: KES ${data.amount || '0'}`,
          [{ text: 'OK' }]
        );
        break;
      case 'stock':
        Alert.alert(
          'Low Stock Alert',
          `Product: ${data.product_name || 'Unknown'}\nCurrent Stock: ${data.current_stock || '0'}`,
          [{ text: 'OK' }]
        );
        break;
      case 'summary':
        Alert.alert(
          'AI Summary Ready',
          'Your daily AI business summary is ready to view.',
          [{ text: 'OK' }]
        );
        loadAiSummaries(); // Refresh summaries
        break;
      default:
        console.log('Unknown notification type:', type);
    }
  };

  const setupWebSocket = () => {
    const businessId = 1; // Replace with actual business ID
    
    wsRef.current = webSocketService.connect(
      businessId,
      (data) => {
        console.log('WebSocket message:', data);
        if (data.type === 'new_sale') {
          setLiveSales(prev => [data.sale, ...prev.slice(0, 9)]);
          loadDashboard();
          
          // If notifications are enabled, show a subtle alert
          if (notificationPermission) {
            Alert.alert(
              '💰 New Sale',
              `Receipt #${data.sale.receipt_number}: KES ${data.sale.total_amount}`,
              [{ text: 'OK' }]
            );
          }
        }
      },
      (error) => {
        console.error('WebSocket error:', error);
      }
    );
  };

  const loadDashboard = async () => {
    try {
      setRefreshing(true);
      const response = await ownerAPI.getDashboard();
      setDashboardData(response.data);
      
      // Simulate expense categories for pie chart
      // In production, get this from your backend
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
    const avg = total / last3Days.length;
    
    // Simple prediction: average of last 3 days
    return avg;
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

  if (!dashboardData) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  // Prepare chart data
  const chartData = {
    labels: salesTrend.slice(-7).map(day => {
      const date = new Date(day.created_at__date);
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    }),
    datasets: [{
      data: salesTrend.slice(-7).map(day => parseFloat(day.total) || 0),
      color: (opacity = 1) => `rgba(25, 118, 210, ${opacity})`,
      strokeWidth: 2
    }]
  };

  const prediction = calculatePrediction();
  const profitMargin = dashboardData.today_sales > 0 
    ? ((dashboardData.today_profit / dashboardData.today_sales) * 100).toFixed(1)
    : 0;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={loadDashboard} />
      }
    >
      {/* Header with Notification Badge */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.title}>Imanage AI Dashboard</Text>
            <Text style={styles.subtitle}>AI-Powered Business Intelligence</Text>
          </View>
          
          <TouchableOpacity 
            onPress={handleNotificationSettings}
            style={styles.notificationButton}
          >
            <View style={styles.notificationBadge}>
              <Text style={styles.bellIcon}>🔔</Text>
              {unreadNotifications > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.notificationStatus}>
              {notificationPermission ? 'ON' : 'OFF'}
            </Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.headerStatus}>
          <Text style={styles.statusText}>
            {notificationPermission ? '🔔 Notifications Active' : '🔕 Notifications Off'}
          </Text>
          <Text style={styles.statusText}>
            {wsRef.current ? '🌐 Live Connected' : '📡 Connecting...'}
          </Text>
        </View>
      </View>

      {/* Real-time Stats Cards */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.statsScroll}
      >
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, styles.primaryCard]}>
            <Text style={styles.statValue}>KES {dashboardData.today_sales.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Today's Revenue</Text>
            {prediction > 0 && (
              <Text style={styles.trendText}>
                📈 Predicted: KES {prediction.toFixed(0)}
              </Text>
            )}
          </View>
          
          <View style={[styles.statCard, styles.profitCard]}>
            <Text style={[styles.statValue, dashboardData.today_profit > 0 ? styles.profitPositive : styles.profitNegative]}>
              KES {dashboardData.today_profit.toLocaleString()}
            </Text>
            <Text style={styles.statLabel}>Today's Net Profit</Text>
            <Text style={styles.marginText}>
              Margin: {profitMargin}%
            </Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{dashboardData.today_transactions}</Text>
            <Text style={styles.statLabel}>Transactions</Text>
            <Text style={styles.avgText}>
              Avg: KES {(dashboardData.today_sales / dashboardData.today_transactions || 0).toFixed(0)}
            </Text>
          </View>
          
          <View style={[styles.statCard, dashboardData.low_stock_items > 0 ? styles.warningCard : styles.successCard]}>
            <Text style={styles.statValue}>{dashboardData.low_stock_items}</Text>
            <Text style={styles.statLabel}>Low Stock Items</Text>
            {dashboardData.low_stock_items > 0 && (
              <Text style={styles.alertText}>⚠️ Needs attention</Text>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Sales Trend Chart */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>7-Day Sales Trend</Text>
          <Text style={styles.chartSubtitle}>Last 7 days performance</Text>
        </View>
        
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
          <View style={styles.noData}>
            <Text style={styles.noDataText}>No sales data available</Text>
          </View>
        )}
      </View>

      {/* Enhanced AI Insights */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>AI Business Insights</Text>
          <TouchableOpacity onPress={generateAiSummary} style={styles.generateButton}>
            <Text style={styles.generateButtonText}>🔄 Generate</Text>
          </TouchableOpacity>
        </View>
        
        {aiSummaries.length > 0 ? (
          <View>
            {/* Latest AI Summary */}
            <View style={styles.aiMainCard}>
              <View style={styles.aiHeader}>
                <Text style={styles.aiDate}>
                  {new Date(aiSummaries[0].date).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </Text>
                <View style={styles.aiStatus}>
                  <View style={[
                    styles.statusDot, 
                    aiSummaries[0].insights?.profitability === 'good' ? styles.statusGood : styles.statusWarning
                  ]} />
                  <Text style={styles.statusText}>
                    {aiSummaries[0].insights?.profitability === 'good' ? 'Profitable' : 'Needs Attention'}
                  </Text>
                </View>
              </View>
              
              <Text style={styles.aiSummary} numberOfLines={4}>
                {aiSummaries[0].ai_summary}
              </Text>
              
              {/* Insights Metrics */}
              <View style={styles.insightsMetrics}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Sales Trend</Text>
                  <Text style={[
                    styles.metricValue,
                    aiSummaries[0].insights?.sales_trend === 'increasing' ? styles.trendUp : styles.trendNeutral
                  ]}>
                    {aiSummaries[0].insights?.sales_trend === 'increasing' ? '📈 Up' : '↔️ Stable'}
                  </Text>
                </View>
                
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Inventory</Text>
                  <Text style={[
                    styles.metricValue,
                    aiSummaries[0].insights?.inventory_health === 'good' ? styles.statusGoodText : styles.statusWarningText
                  ]}>
                    {aiSummaries[0].insights?.inventory_health === 'good' ? '✅ Healthy' : '⚠️ Low'}
                  </Text>
                </View>
                
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Expenses</Text>
                  <Text style={[
                    styles.metricValue,
                    aiSummaries[0].insights?.expense_control === 'good' ? styles.statusGoodText : styles.statusWarningText
                  ]}>
                    {aiSummaries[0].insights?.expense_control === 'good' ? '✅ Controlled' : '⚠️ High'}
                  </Text>
                </View>
              </View>
              
              {/* Recommendations */}
              {aiSummaries[0].recommendations && aiSummaries[0].recommendations.length > 0 && (
                <View style={styles.recommendations}>
                  <Text style={styles.recommendationsTitle}>AI Recommendations:</Text>
                  {aiSummaries[0].recommendations.slice(0, 3).map((rec, idx) => (
                    <View key={idx} style={styles.recommendationItem}>
                      <Text style={styles.bullet}>•</Text>
                      <Text style={styles.recommendationText}>{rec}</Text>
                    </View>
                  ))}
                </View>
              )}
              
              <TouchableOpacity 
                onPress={() => Alert.alert('Full AI Analysis', aiSummaries[0].ai_summary)}
                style={styles.readMoreButton}
              >
                <Text style={styles.readMoreText}>View Full Analysis →</Text>
              </TouchableOpacity>
            </View>
            
            {/* Previous Summaries (Collapsible) */}
            {aiSummaries.length > 1 && (
              <View style={styles.previousSummaries}>
                <Text style={styles.previousTitle}>Previous Days:</Text>
                {aiSummaries.slice(1, 3).map((summary, index) => (
                  <TouchableOpacity 
                    key={index} 
                    style={styles.previousCard}
                    onPress={() => Alert.alert(
                      `${new Date(summary.date).toLocaleDateString()} Summary`,
                      summary.ai_summary
                    )}
                  >
                    <Text style={styles.previousDate}>
                      {new Date(summary.date).toLocaleDateString()}
                    </Text>
                    <Text style={styles.previousSummary} numberOfLines={2}>
                      {summary.ai_summary.substring(0, 100)}...
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.noData}>
            <Text style={styles.noDataText}>No AI insights yet</Text>
            <Text style={styles.noDataSubtext}>Generate your first AI summary</Text>
            <TouchableOpacity onPress={generateAiSummary} style={styles.generateFirstButton}>
              <Text style={styles.generateFirstButtonText}>Generate AI Summary</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Expense Breakdown */}
      {dashboardData.today_expenses > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Expense Breakdown</Text>
          <PieChart
            data={expenseData}
            width={screenWidth - 40}
            height={200}
            chartConfig={{
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            }}
            accessor="amount"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
          />
          <Text style={styles.expenseTotal}>
            Total Expenses: KES {dashboardData.today_expenses.toLocaleString()}
          </Text>
        </View>
      )}

      {/* Live Sales Feed */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Live Sales Feed</Text>
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>
        
        {liveSales.length > 0 ? (
          <View>
            {liveSales.slice(0, 5).map((sale, index) => (
              <View key={index} style={styles.liveSaleItem}>
                <View>
                  <Text style={styles.saleReceipt}>{sale.receipt_number}</Text>
                  <Text style={styles.saleTime}>
                    {new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <Text style={styles.saleAmount}>KES {sale.total_amount}</Text>
                <View style={[
                  styles.profitIndicator,
                  { backgroundColor: sale.total_amount > 1000 ? '#4CAF50' : '#2196F3' }
                ]}>
                  <Text style={styles.profitIndicatorText}>
                    {sale.total_amount > 1000 ? 'HIGH' : 'NORMAL'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.noData}>Waiting for sales... 💤</Text>
        )}
      </View>

      {/* Performance Metrics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Performance Metrics</Text>
        <View style={styles.metricsGrid}>
          <View style={styles.metricBox}>
            <Text style={styles.metricNumber}>
              {dashboardData.avg_transaction ? dashboardData.avg_transaction.toFixed(0) : 0}
            </Text>
            <Text style={styles.metricDescription}>Avg. Transaction</Text>
          </View>
          
          <View style={styles.metricBox}>
            <Text style={styles.metricNumber}>
              {dashboardData.today_gross_profit ? dashboardData.today_gross_profit.toLocaleString() : 0}
            </Text>
            <Text style={styles.metricDescription}>Gross Profit</Text>
          </View>
          
          <View style={styles.metricBox}>
            <Text style={styles.metricNumber}>
              {profitMargin}%
            </Text>
            <Text style={styles.metricDescription}>Profit Margin</Text>
          </View>
          
          <View style={styles.metricBox}>
            <Text style={styles.metricNumber}>
              {dashboardData.low_stock_items}
            </Text>
            <Text style={styles.metricDescription}>Low Stock</Text>
          </View>
        </View>
      </View>

      {/* Notification Status Banner */}
      {!notificationPermission && (
        <TouchableOpacity 
          onPress={initializeNotifications}
          style={styles.notificationBanner}
        >
          <Text style={styles.notificationBannerText}>
            🔕 Notifications are disabled. Tap to enable real-time alerts.
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    backgroundColor: '#1976d2',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 5,
  },
  notificationButton: {
    alignItems: 'center',
  },
  notificationBadge: {
    position: 'relative',
  },
  bellIcon: {
    fontSize: 24,
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  notificationStatus: {
    fontSize: 10,
    color: 'white',
    marginTop: 4,
    fontWeight: '600',
  },
  headerStatus: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  statusText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
  },
  statsScroll: {
    marginTop: -20,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 10,
    paddingLeft: 15,
  },
  statCard: {
    width: 180,
    backgroundColor: 'white',
    padding: 15,
    marginRight: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#1976d2',
  },
  profitCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  warningCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  successCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  statValue: {
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
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 3,
  },
  trendText: {
    fontSize: 10,
    color: '#666',
    marginTop: 5,
  },
  marginText: {
    fontSize: 10,
    color: '#4CAF50',
    fontWeight: '500',
    marginTop: 5,
  },
  avgText: {
    fontSize: 10,
    color: '#666',
    marginTop: 5,
  },
  alertText: {
    fontSize: 10,
    color: '#FF9800',
    fontWeight: '500',
    marginTop: 5,
  },
  section: {
    backgroundColor: 'white',
    margin: 15,
    marginTop: 10,
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  chartSubtitle: {
    fontSize: 12,
    color: '#666',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  generateButton: {
    backgroundColor: '#1976d2',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  generateButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
  aiMainCard: {
    backgroundColor: '#f0f7ff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#d1e3ff',
  },
  aiHeader: {
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
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 5,
  },
  statusGood: {
    backgroundColor: '#4CAF50',
  },
  statusWarning: {
    backgroundColor: '#FF9800',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
  },
  aiSummary: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 15,
  },
  insightsMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  metricItem: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 3,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  trendUp: {
    color: '#4CAF50',
  },
  trendNeutral: {
    color: '#FF9800',
  },
  statusGoodText: {
    color: '#4CAF50',
  },
  statusWarningText: {
    color: '#FF9800',
  },
  recommendations: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e8f4ff',
  },
  recommendationsTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 8,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 5,
  },
  bullet: {
    fontSize: 16,
    color: '#1976d2',
    marginRight: 8,
    marginTop: -1,
  },
  recommendationText: {
    fontSize: 13,
    color: '#333',
    flex: 1,
    lineHeight: 18,
  },
  readMoreButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  readMoreText: {
    color: '#1976d2',
    fontWeight: '600',
    fontSize: 13,
  },
  previousSummaries: {
    marginTop: 10,
  },
  previousTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
  },
  previousCard: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  previousDate: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  previousSummary: {
    fontSize: 12,
    color: '#333',
    lineHeight: 16,
  },
  expenseTotal: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 10,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
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
  liveSaleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  saleReceipt: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  saleTime: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  saleAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  profitIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  profitIndicatorText: {
    fontSize: 9,
    color: 'white',
    fontWeight: 'bold',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricBox: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    alignItems: 'center',
  },
  metricNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 5,
  },
  metricDescription: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  noData: {
    padding: 30,
    alignItems: 'center',
  },
  noDataText: {
    color: '#888',
    fontSize: 14,
    marginBottom: 5,
  },
  noDataSubtext: {
    color: '#aaa',
    fontSize: 12,
    marginBottom: 15,
  },
  generateFirstButton: {
    backgroundColor: '#1976d2',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  generateFirstButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  notificationBanner: {
    backgroundColor: '#FF9800',
    margin: 15,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  notificationBannerText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default DashboardScreen;