import React, { createContext, useContext, useReducer, useState, useMemo ,useRef,useEffect} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StatusBar,
  RefreshControl,
  Alert,
  Platform,
  Animated,
} from 'react-native';
import Modal from 'react-native-modal';
import { Picker } from '@react-native-picker/picker';
import * as Haptics from 'expo-haptics';
import { MOCK_LEADS ,Lead } from '@/app/all_lead';
import { styles } from './styles';


interface Filters {
  status: string[];
  qualification: string[];
  assignedTo: string[];
  source: string[];
}

interface LeadState {
  leads: Lead[];
  filters: Filters;
  filterLogic: 'AND' | 'OR';
}

type NewLead = Omit<Lead, 'id'>;

type LeadAction =
  | { type: 'ADD_LEAD'; payload: NewLead }
  | { type: 'APPLY_FILTER'; payload: { filters: Filters; logic: 'AND' | 'OR' } }
  | { type: 'CLEAR_FILTER' }
  | { type: 'DELETE_LEAD'; payload: string };

interface LeadContextType {
  state: LeadState;
  dispatch: React.Dispatch<LeadAction>;
}



// State Management
const LeadContext = createContext<LeadContextType | undefined>(undefined);

const leadReducer = (state: LeadState, action: LeadAction): LeadState => {
  switch (action.type) {
    case 'ADD_LEAD':
      return {
        ...state,
        leads: [...state.leads, { ...action.payload, id: Date.now().toString() }],
      };
    case 'APPLY_FILTER':
      return {
        ...state,
        filters: action.payload.filters,
        filterLogic: action.payload.logic,
      };
    case 'CLEAR_FILTER':
      return {
        ...state,
        filters: { status: [], qualification: [], assignedTo: [], source: [] },
        filterLogic: 'AND',
      };
    case 'DELETE_LEAD':
      return {
        ...state,
        leads: state.leads.filter(lead => lead.id !== action.payload),
      };
    default:
      return state;
  }
};

const initialState: LeadState = {
  leads: MOCK_LEADS,
  filters: { status: [], qualification: [], assignedTo: [], source: [] },
  filterLogic: 'AND',
};

const LeadProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(leadReducer, initialState);
  return <LeadContext.Provider value={{ state, dispatch }}>{children}</LeadContext.Provider>;
};

const useLeads = (): LeadContextType => {
  const context = useContext(LeadContext);
  if (!context) {
    throw new Error('useLeads must be used within LeadProvider');
  }
  return context;
};

// Toast Component
interface ToastProps {
  visible: boolean;
  message: string;
  onHide: () => void;
}

const Toast: React.FC<ToastProps> = ({ visible, message, onHide }) => {
  const slideAnim = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(slideAnim, { toValue: 50, duration: 300, useNativeDriver: true }),
        Animated.delay(2000),
        Animated.timing(slideAnim, { toValue: -100, duration: 300, useNativeDriver: true }),
      ]).start(() => onHide());
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.toast, { transform: [{ translateY: slideAnim }] }]}>
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  );
};

// StatusBadge Component
interface StatusBadgeProps {
  status: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getStatusColor = (): string => {
    switch (status.toLowerCase()) {
      case 'hot':
      case 'converted':
        return '#FF6B6B';
      case 'warm':
      case 'follow-up':
        return '#FFD93D';
      case 'cold':
      case 'new':
        return '#74C0FC';
      case 'qualified':
        return '#28A745';
      default:
        return '#ADB5BD';
    }
  };

  return (
    <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
      <Text style={styles.statusText}>{status.toUpperCase()}</Text>
    </View>
  );
};

// LeadCard Component
interface LeadCardProps {
  lead: Lead;
  index: number;
  onPress?: () => void;
  onDelete?: () => void;
}

const LeadCard: React.FC<LeadCardProps> = ({ lead, index, onPress, onDelete }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const handleLongPress = () => {
  if (Platform.OS !== 'web' && Haptics.impactAsync) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }
  onDelete && onDelete();
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, delay: index * 100, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, delay: index * 100, useNativeDriver: true }),
    ]).start();
  }, [index]);

  const handlePress = () => {
    if (Platform.OS !== 'web' && Haptics.impactAsync) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
    onPress && onPress();
  };

  return (
    <Animated.View style={[styles.leadCard, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity onPress={handlePress} onLongPress={handleLongPress} activeOpacity={0.9}>
        <View style={styles.cardHeader}>
          <Text style={styles.leadName}>{lead.name}</Text>
                    <View style={styles.headerRight}>
           <StatusBadge status={lead.status} />
           <TouchableOpacity onPress={onDelete} style={styles.deleteButton}>
             <Text style={styles.deleteButtonText}>×</Text>
           </TouchableOpacity>
         </View>
        </View>
        <Text style={styles.leadContact}>{lead.contact}</Text>
        <Text style={styles.leadEmail}>{lead.email}</Text>
        <View style={styles.cardMeta}>
          <Text style={styles.metaText}>Qualification: {lead.qualification}</Text>
          <Text style={styles.metaText}>Interest: {lead.interest}</Text>
          <Text style={styles.metaText}>Source: {lead.source}</Text>
        </View>
        <View style={styles.cardFooter}>
          <Text style={styles.assignedText}>Assigned to: {lead.assignedTo}</Text>
          <Text style={styles.dateText}>{lead.createdAt}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// FloatingActionButton Component
interface FloatingActionButtonProps {
  onPress: () => void;
  icon?: string;
}

const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({ onPress, icon = '+' }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    if (Platform.OS !== 'web' && Haptics.impactAsync) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.9, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  return (
    <Animated.View style={[styles.fab, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity onPress={handlePress} style={styles.fabButton}>
        <Text style={styles.fabText}>{icon}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

// AddLeadModal Component (Updated to use react-native-modal)
type LeadFormData = Omit<Lead, 'id' | 'createdAt'>;

const AddLeadModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  onSubmit: (lead: NewLead) => void;
}> = ({ visible, onClose, onSubmit }) => {
  const [formData, setFormData] = useState<LeadFormData>({
    name: '',
    contact: '',
    altPhone: '',
    email: '',
    status: 'new',
    qualification: 'high school',
    interest: '',
    source: '',
    assignedTo: '',
    jobInterest: '',
    state: '',
    city: '',
    passoutYear: '',
    heardFrom: '',
  });

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter a name');
      return;
    }
    onSubmit({ ...formData, createdAt: new Date().toISOString().split('T')[0] });
    setFormData({
      name: '',
      contact: '',
      altPhone: '',
      email: '',
      status: 'new',
      qualification: 'high school',
      interest: '',
      source: '',
      assignedTo: '',
      jobInterest: '',
      state: '',
      city: '',
      passoutYear: '',
      heardFrom: '',
    });
    onClose();
  };

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onClose}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      style={{ margin: 0, justifyContent: 'flex-end' }}
      backdropOpacity={0.5}
      backdropColor="black"
    >
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Add New Lead</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Name *</Text>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              placeholder="Enter full name"
              placeholderTextColor="#999"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Contact</Text>
            <TextInput
              style={styles.input}
              value={formData.contact}
              onChangeText={(text) => setFormData({ ...formData, contact: text })}
              placeholder="Phone number"
              keyboardType="phone-pad"
              placeholderTextColor="#999"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Alt. Phone</Text>
            <TextInput
              style={styles.input}
              value={formData.altPhone}
              onChangeText={(text) => setFormData({ ...formData, altPhone: text })}
              placeholder="Alternate phone"
              keyboardType="phone-pad"
              placeholderTextColor="#999"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              placeholder="Email address"
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#999"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Status</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
                style={styles.picker}
              >
                <Picker.Item label="New" value="new" />
                <Picker.Item label="Follow-Up" value="follow-up" />
                <Picker.Item label="Qualified" value="qualified" />
                <Picker.Item label="Converted" value="converted" />
              </Picker>
            </View>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Qualification</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.qualification}
                onValueChange={(value) => setFormData({ ...formData, qualification: value })}
                style={styles.picker}
              >
                <Picker.Item label="High School" value="high school" />
                <Picker.Item label="Bachelors" value="bachelors" />
                <Picker.Item label="Masters" value="masters" />
                <Picker.Item label="PhD" value="phd" />
                <Picker.Item label="Other" value="other" />
              </Picker>
            </View>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Interest</Text>
            <TextInput
              style={styles.input}
              value={formData.interest}
              onChangeText={(text) => setFormData({ ...formData, interest: text })}
              placeholder="Area of interest"
              placeholderTextColor="#999"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Source</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.source}
                onValueChange={(value) => setFormData({ ...formData, source: value })}
                style={styles.picker}
              >
                <Picker.Item label="Select source" value="" />
                <Picker.Item label="Website" value="Website" />
                <Picker.Item label="Referral" value="Referral" />
                <Picker.Item label="Social Media" value="Social Media" />
                <Picker.Item label="Cold Call" value="Cold Call" />
              </Picker>
            </View>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Assigned To</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.assignedTo}
                onValueChange={(value) => setFormData({ ...formData, assignedTo: value })}
                style={styles.picker}
              >
                <Picker.Item label="Select assignee" value="" />
                <Picker.Item label="John Smith" value="John Smith" />
                <Picker.Item label="Jane Doe" value="Jane Doe" />
                <Picker.Item label="Emily Davis" value="Emily Davis" />
              </Picker>
            </View>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Job Interest</Text>
            <TextInput
              style={styles.input}
              value={formData.jobInterest}
              onChangeText={(text) => setFormData({ ...formData, jobInterest: text })}
              placeholder="Job interest"
              placeholderTextColor="#999"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>State</Text>
            <TextInput
              style={styles.input}
              value={formData.state}
              onChangeText={(text) => setFormData({ ...formData, state: text })}
              placeholder="State"
              placeholderTextColor="#999"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>City</Text>
            <TextInput
              style={styles.input}
              value={formData.city}
              onChangeText={(text) => setFormData({ ...formData, city: text })}
              placeholder="City"
              placeholderTextColor="#999"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Passout Year</Text>
            <TextInput
              style={styles.input}
              value={formData.passoutYear}
              onChangeText={(text) => setFormData({ ...formData, passoutYear: text })}
              placeholder="Passout year"
              keyboardType="numeric"
              placeholderTextColor="#999"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Heard From</Text>
            <TextInput
              style={styles.input}
              value={formData.heardFrom}
              onChangeText={(text) => setFormData({ ...formData, heardFrom: text })}
              placeholder="Heard from"
              placeholderTextColor="#999"
            />
          </View>
        </ScrollView>
        <View style={styles.modalActions}>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
            <Text style={styles.submitButtonText}>Add Lead</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// FilterPanel Component (Updated to use react-native-modal)
interface FilterCondition {
  category: keyof Filters;
  value: string;
}

const FilterPanel: React.FC<{
  visible: boolean;
  onClose: () => void;
  onApplyFilters: (filters: Filters, logic: 'AND' | 'OR') => void;
}> = ({ visible, onClose, onApplyFilters }) => {
  const [filterConditions, setFilterConditions] = useState<FilterCondition[]>([
    { category: 'status', value: '' },
  ]);
  const [filterLogic, setFilterLogic] = useState<'AND' | 'OR'>('AND');

const FILTER_OPTIONS: { [key in keyof Filters]: string[] } = {
  status: ['new', 'follow-up', 'qualified', 'converted', 'hot', 'warm', 'cold'], // Added statuses from mock data
  qualification: ['high school', 'bachelors', 'masters', 'phd', 'other', 'marketing_qualified', 'sales_qualified'], // Added qualifications
  assignedTo: ['John Smith', 'Jane Doe', 'Emily Davis', 'Robert Johnson'], // Added assignees
  source: [
    'Website', 
    'Referral', 
    'Social Media', 
    'Cold Call',
    'Email Campaign',
    'LinkedIn',
    'Webinar',
    'Blog',
    'Event',
    'Google Ads',
    'Twitter',
    'Facebook',
    'Organic Search',
    'Dribbble',
    'Colleague',
    'Research Paper',
    'Industry Event',
    'Newsletter',
    'Discord',
    'Conference'
  ] 
};

  const handleApply = () => {
    const newFilters: Filters = {
      status: [],
      qualification: [],
      assignedTo: [],
      source: [],
    };
    filterConditions.forEach((condition) => {
      if (condition.value) {
        newFilters[condition.category].push(condition.value);
      }
    });
    Object.keys(newFilters).forEach((key) => {
      newFilters[key as keyof Filters] = [...new Set(newFilters[key as keyof Filters])];
    });
    onApplyFilters(newFilters, filterLogic);
    onClose();
  };

  const handleClear = () => {
    setFilterConditions([{ category: 'status', value: '' }]);
    setFilterLogic('AND');
    onApplyFilters({ status: [], qualification: [], assignedTo: [], source: [] }, 'AND');
    onClose();
  };

  const addFilter = () => {
    setFilterConditions([...filterConditions, { category: 'status', value: '' }]);
  };

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onClose}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      style={{ margin: 0, justifyContent: 'flex-end' }}
      backdropOpacity={0.5}
      backdropColor="black"
    >
      <View style={styles.filterPanel}>
        <View style={styles.filterHeader}>
          <Text style={styles.filterTitle}>Advanced Filters</Text>
          <View style={styles.logicToggle}>
            <TouchableOpacity
              style={[styles.logicButton, filterLogic === 'AND' && styles.logicButtonActive]}
              onPress={() => setFilterLogic('AND')}
            >
              <Text style={[styles.logicButtonText, filterLogic === 'AND' && styles.logicButtonTextActive]}>
                AND
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.logicButton, filterLogic === 'OR' && styles.logicButtonActive]}
              onPress={() => setFilterLogic('OR')}
            >
              <Text style={[styles.logicButtonText, filterLogic === 'OR' && styles.logicButtonTextActive]}>
                OR
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <ScrollView style={styles.filterContent} showsVerticalScrollIndicator={false}>
          {filterConditions.map((condition, index) => (
            <View key={index} style={styles.filterRow}>
              <Picker
                selectedValue={condition.category}
                onValueChange={(value) => {
                  const newConditions = [...filterConditions];
                  newConditions[index].category = value as keyof Filters;
                  newConditions[index].value = '';
                  setFilterConditions(newConditions);
                }}
                style={styles.categoryPicker}
              >
                <Picker.Item label="Status" value="status" />
                <Picker.Item label="Qualification" value="qualification" />
                <Picker.Item label="Assigned To" value="assignedTo" />
                <Picker.Item label="Source" value="source" />
              </Picker>
              <Picker
                selectedValue={condition.value}
                onValueChange={(value) => {
                  const newConditions = [...filterConditions];
                  newConditions[index].value = value;
                  setFilterConditions(newConditions);
                }}
                style={styles.valuePicker}
              >
                <Picker.Item label="Select value" value="" />
                {FILTER_OPTIONS[condition.category].map((option) => (
                  <Picker.Item key={option} label={option} value={option} />
                ))}
              </Picker>
              <TouchableOpacity
                onPress={() => setFilterConditions(filterConditions.filter((_, i) => i !== index))}
              >
                <Text style={styles.removeButton}>×</Text>
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity onPress={addFilter}>
            <Text style={styles.addFilterButton}>+ Add Filter</Text>
          </TouchableOpacity>
        </ScrollView>
        <View style={styles.filterActions}>
          <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
            <Text style={styles.clearButtonText}>Clear All</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
            <Text style={styles.applyButtonText}>Apply Filters</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// LeadList Component
const LeadList: React.FC = () => {
  const { state, dispatch } = useLeads();
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLeads = useMemo(() => {
    let leads = state.leads;

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      leads = leads.filter(
        (lead) =>
          lead.name.toLowerCase().includes(term) ||
          lead.email.toLowerCase().includes(term) ||
          lead.contact.toLowerCase().includes(term)
      );
    }

    if (Object.keys(state.filters).some((key) => state.filters[key as keyof Filters].length > 0)) {
      leads = leads.filter((lead) => {
        const filterChecks: boolean[] = [];
        Object.entries(state.filters).forEach(([category, values]) => {
          if (values.length > 0) {
            if (category === 'assignedTo') {
              filterChecks.push(values.includes(lead.assignedTo));
            } else {
              filterChecks.push(values.includes(lead[category as keyof Lead]));
            }
          }
        });
        return state.filterLogic === 'AND' ? filterChecks.every(Boolean) : filterChecks.some(Boolean);
      });
    }

    return leads;
  }, [state.leads, state.filters, state.filterLogic, searchTerm]);

  const showToast = (message: string) => {
    setToastMessage(message);
    setToastVisible(true);
  };

  const handleAddLead = (leadData: NewLead) => {
    dispatch({ type: 'ADD_LEAD', payload: leadData });
    setIsAddModalVisible(false);
    showToast('Lead added successfully!');
  };

  const handleApplyFilters = (filters: Filters, logic: 'AND' | 'OR') => {
    dispatch({ type: 'APPLY_FILTER', payload: { filters, logic } });
    showToast(`Filters applied! Showing ${filteredLeads.length} leads`);
  };

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      showToast('Leads refreshed!');
    }, 1000);
  };

  const renderLeadItem = ({ item, index }: { item: Lead; index: number }) => (
    <LeadCard lead={item} index={index} onPress={() => showToast(`Viewing ${item.name}`)}  onDelete={() => handleDeleteLead(item.id)}/>
  );
  const handleDeleteLead = (leadId: string) => {
    Alert.alert(
      "Delete Lead",
     "Are you sure you want to delete this lead?",
     [
       { text: "Cancel", style: "cancel" },
       { 
        text: "Delete", 
                  onPress: () => {
            dispatch({ type: 'DELETE_LEAD', payload: leadId });
            showToast('Lead deleted successfully!');
         }
       }
     ]    );
 };
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Leads</Text>
        <TouchableOpacity style={styles.filterButton} onPress={() => setIsFilterVisible(true)}>
          <Text style={styles.filterButtonText}>⚙</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, email or phone..."
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>
      <FlatList
        data={filteredLeads}
        renderItem={renderLeadItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#007AFF']}
            tintColor="#007AFF"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No leads found</Text>
            <Text style={styles.emptySubtext}>Try adjusting your filters or add a new lead</Text>
          </View>
        }
      />
      <View style={styles.fabContainer}>
        <FloatingActionButton onPress={() => setIsAddModalVisible(true)} icon="+" />
      </View>
      <AddLeadModal
        visible={isAddModalVisible}
        onClose={() => setIsAddModalVisible(false)}
        onSubmit={handleAddLead}
      />
      <FilterPanel
        visible={isFilterVisible}
        onClose={() => setIsFilterVisible(false)}
        onApplyFilters={handleApplyFilters}
      />
      <Toast visible={toastVisible} message={toastMessage} onHide={() => setToastVisible(false)} />
    </View>
  );
};

// Index Component
const Index: React.FC = () => {
  return (
    <LeadProvider>
      <LeadList />
    </LeadProvider>
  );
};



export default Index;