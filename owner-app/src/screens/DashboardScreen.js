import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { ownerAPI, webSocketService } from '../services/api';

const DashboardScreen = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [aiSummaries, setAiSummaries] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [liveSales, setLiveSales] = useState([]);
  const wsRef = useRef(null);

  useEffect(() => {
    loadDashboard();
    loadAiSummaries();
    setupWebSocket();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.disconnect();
      }
    };
  }, []);

  const setupWebSocket = () => {
    const businessId = 1; // Replace with actual business ID
    
    wsRef.current = webSocketService.connect(
      businessId,
      (data) => {
        console.log('WebSocket message:', data);
        if (data.type === 'new_sale') {
          setLiveSales(prev => [data.sale, ...prev.slice(0, 9)]);
          loadDashboard();
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
    } catch (error) {
      console.error('Failed to load AI summaries:', error);
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

  if (!dashboardData) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={loadDashboard} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Imanage AI Dashboard</Text>
        <Text style={styles.subtitle}>AI-Powered Business Intelligence</Text>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>KES {dashboardData.today_sales}</Text>
          <Text style={styles.statLabel}>Today's Sales</Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{dashboardData.today_transactions}</Text>
          <Text style={styles.statLabel}>Transactions</Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={styles.statValue}>KES {dashboardData.today_profit}</Text>
          <Text style={styles.statLabel}>Today's Profit</Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={[styles.statValue, dashboardData.low_stock_items > 0 ? styles.warning : null]}>
            {dashboardData.low_stock_items}
          </Text>
          <Text style={styles.statLabel}>Low Stock</Text>
        </View>
      </View>

      {/* AI Insights Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>AI Insights</Text>
          <TouchableOpacity onPress={generateAiSummary}>
            <Text style={styles.generateButton}>Generate</Text>
          </TouchableOpacity>
        </View>
        
        {aiSummaries.length > 0 ? (
          aiSummaries.slice(0, 2).map((summary, index) => (
            <View key={index} style={styles.aiCard}>
              <Text style={styles.aiDate}>
                {new Date(summary.date).toLocaleDateString()}
              </Text>
              <Text style={styles.aiSummary} numberOfLines={3}>
                {summary.ai_summary}
              </Text>
              <TouchableOpacity onPress={() => Alert.alert('Full Analysis', summary.ai_summary)}>
                <Text style={styles.readMore}>Read more →</Text>
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <View style={styles.noData}>
            <Text style={styles.noDataText}>No AI insights yet</Text>
            <Text style={styles.noDataSubtext}>Generate AI summary to get insights</Text>
          </View>
        )}
      </View>

      {/* Live Sales */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Live Sales</Text>
        {liveSales.length > 0 ? (
          liveSales.map((sale, index) => (
            <View key={index} style={styles.saleItem}>
              <Text style={styles.saleReceipt}>{sale.receipt_number}</Text>
              <Text style={styles.saleAmount}>KES {sale.total_amount}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.noData}>No recent sales</Text>
        )}
      </View>

      {/* Recent Sales */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Sales</Text>
        {dashboardData.recent_sales.map((sale, index) => (
          <View key={index} style={styles.saleItem}>
            <Text style={styles.saleReceipt}>{sale.receipt_number}</Text>
            <Text style={styles.saleAmount}>KES {sale.total_amount}</Text>
            <Text style={styles.saleTime}>
              {new Date(sale.created_at).toLocaleTimeString()}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#1976d2',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 5,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
  },
  statCard: {
    width: '48%',
    backgroundColor: 'white',
    padding: 15,
    margin: '1%',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  warning: {
    color: '#ff9800',
  },
  section: {
    backgroundColor: 'white',
    margin: 10,
    padding: 15,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  generateButton: {
    color: '#1976d2',
    fontWeight: 'bold',
  },
  aiCard: {
    backgroundColor: '#f0f7ff',
    padding: 12,
    borderRadius: 6,
    marginBottom: 10,
  },
  aiDate: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  aiSummary: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  readMore: {
    color: '#1976d2',
    fontSize: 12,
    marginTop: 5,
  },
  saleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  saleReceipt: {
    fontSize: 14,
    color: '#333',
  },
  saleAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  saleTime: {
    fontSize: 12,
    color: '#888',
  },
  noData: {
    padding: 20,
    alignItems: 'center',
  },
  noDataText: {
    color: '#888',
    fontSize: 14,
  },
  noDataSubtext: {
    color: '#aaa',
    fontSize: 12,
    marginTop: 5,
  },
});

export default DashboardScreen;