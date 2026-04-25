import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import {
  BarcodeScanningResult,
  CameraView,
  useCameraPermissions,
} from 'expo-camera';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Speech from 'expo-speech';

import { Colors } from '../../constants/Colors';
import { useTheme } from '../../context/ThemeContext';
import { ThemeType } from '../../constants/theme';
import { addFoodLog } from '../../services/logService';
import {
  PortionCategory,
  resolveBarcodeScan,
  resolveDetectedItemForPortion,
  resolveImageScan,
  scaleDetectedItemForPortion,
  searchManualFoods,
  ScanDetectedItem,
  ScanResolution,
} from '../../services/scanService';

const portionLabels: Record<PortionCategory, string> = {
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
  '1 bowl': '1 Bowl',
  '1 plate': '1 Plate',
  '1 piece': '1 Piece',
};

const portionHelpers: Record<PortionCategory, string> = {
  small: 'lighter portion',
  medium: 'default portion',
  large: 'bigger portion',
  '1 bowl': 'one bowl',
  '1 plate': 'one plate',
  '1 piece': 'single piece',
};

const confidenceLabel = (confidence: number): string => {
  if (confidence >= 0.85) return 'High confidence';
  if (confidence >= 0.65) return 'Medium confidence';
  return 'Low confidence';
};

const confidenceColor = (confidence: number): string => {
  if (confidence >= 0.85) return Colors.PRIMARY;
  if (confidence >= 0.65) return Colors.ACCENT;
  return Colors.SECONDARY;
};

const formatMacros = (food: ScanResolution['foodData']) => {
  return `${food.calories} kcal • C ${food.carbs}g • P ${food.protein}g • F ${food.fat}g`;
};

const displayNutritionValue = (value?: number): string => {
  if (value == null || !Number.isFinite(value)) return '--';
  return `${Math.max(1, Math.round(value))}`;
};

const applyQuantityMultiplier = (
  item: ScanDetectedItem,
  quantity: number
): ScanDetectedItem => {
  const safeQuantity = Math.max(1, quantity);

  if (safeQuantity === 1) {
    return item;
  }

  return {
    ...item,
    foodData: {
      ...item.foodData,
      calories: Math.round(item.foodData.calories * safeQuantity),
      carbs: Math.round(item.foodData.carbs * safeQuantity),
      protein: Math.round(item.foodData.protein * safeQuantity),
      fat: Math.round(item.foodData.fat * safeQuantity),
      servingSize: `${safeQuantity} x ${item.foodData.servingSize}`,
    },
  };
};

const ScanFoodScreen = () => {
  const { user } = useUser();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const styles = getStyles(theme);

  const cameraRef = useRef<any>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const isFocused = useIsFocused();
  const scanLockRef = useRef(false);
  const lastBarcodeRef = useRef<string | null>(null);
  const manualSearchRequestIdRef = useRef(0);

  const [isCameraReady, setIsCameraReady] = useState(false);
  const [mode, setMode] = useState<'barcode' | 'photo'>('barcode');

  const [isResolving, setIsResolving] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [scanResult, setScanResult] = useState<ScanResolution | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedPortions, setSelectedPortions] = useState<
    Record<string, PortionCategory>
  >({});
  const [selectedPortionCounts, setSelectedPortionCounts] = useState<
    Record<string, number>
  >({});
  const [selectedItemsToLog, setSelectedItemsToLog] = useState<
    Record<string, boolean>
  >({});

  const [capturedImageUri, setCapturedImageUri] = useState<string | null>(null);

  const [manualQuery, setManualQuery] = useState('');
  const [manualResults, setManualResults] = useState<ScanResolution[]>([]);
  const [manualSearchLoading, setManualSearchLoading] = useState(false);

  const [scanMessage, setScanMessage] = useState(
    'Scan a barcode or capture a food photo.'
  );

  const [showManualSearch, setShowManualSearch] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);

  const [activeResolvedItem, setActiveResolvedItem] =
    useState<ScanDetectedItem | null>(null);
  const [isResolvingPortionNutrition, setIsResolvingPortionNutrition] =
    useState(false);

  const shouldShowCamera = !scanResult && !capturedImageUri;

  useEffect(() => {
    if (!permission) return;

    if (!permission.granted) {
      setScanMessage('Camera permission is required to scan foods.');
    }
  }, [permission]);

  useEffect(() => {
    if (!isFocused || !shouldShowCamera) {
      setIsCameraReady(false);
    }
  }, [isFocused, shouldShowCamera]);

  useEffect(() => {
    const trimmedQuery = manualQuery.trim();

    if (trimmedQuery.length < 2) {
      setManualResults([]);
      setManualSearchLoading(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      const requestId = ++manualSearchRequestIdRef.current;
      setManualSearchLoading(true);

      try {
        const results = await searchManualFoods(trimmedQuery);

        if (requestId === manualSearchRequestIdRef.current) {
          setManualResults(results);
        }
      } catch (error) {
        console.error('Manual food search failed:', error);

        if (requestId === manualSearchRequestIdRef.current) {
          setManualResults([]);
        }
      } finally {
        if (requestId === manualSearchRequestIdRef.current) {
          setManualSearchLoading(false);
        }
      }
    }, 450);

    return () => clearTimeout(timeoutId);
  }, [manualQuery]);

  const resetScan = () => {
    scanLockRef.current = false;
    lastBarcodeRef.current = null;

    setScanResult(null);
    setSelectedItemId(null);
    setSelectedPortions({});
    setSelectedPortionCounts({});
    setSelectedItemsToLog({});
    setCapturedImageUri(null);

    setManualQuery('');
    setManualResults([]);
    setManualSearchLoading(false);

    setScanMessage('Scan a barcode or capture a food photo.');
    setShowSaveSuccess(false);
    setShowManualSearch(false);

    setActiveResolvedItem(null);
    setIsResolvingPortionNutrition(false);
    setIsResolving(false);
  };

  const getDetectedItems = (resolution: ScanResolution): ScanDetectedItem[] => {
    if (resolution.detectedItems && resolution.detectedItems.length > 0) {
      return resolution.detectedItems;
    }

    return [
      {
        id: resolution.id,
        label: resolution.label,
        detectedQuantity: resolution.detectedQuantity || 1,
        confidence: resolution.confidence,
        basePortionCategory: resolution.basePortionCategory,
        portionCategory: resolution.portionCategory,
        portionOptions: resolution.portionOptions,
        foodData: resolution.foodData,
      },
    ];
  };

  const applyResolution = (resolution: ScanResolution) => {
    const detectedItems = getDetectedItems(resolution);
    const defaultItem = detectedItems[0];

    const defaultPortions = detectedItems.reduce<Record<string, PortionCategory>>(
      (acc, item) => {
        acc[item.id] = item.basePortionCategory;
        return acc;
      },
      {}
    );

    const defaultSelectedItems = detectedItems.reduce<Record<string, boolean>>(
      (acc, item) => {
        acc[item.id] = true;
        return acc;
      },
      {}
    );

    const defaultPortionCounts = detectedItems.reduce<Record<string, number>>(
      (acc, item) => {
        acc[item.id] = Math.max(1, item.detectedQuantity || 1);
        return acc;
      },
      {}
    );

    setScanResult(resolution);
    setSelectedItemId(defaultItem?.id || null);
    setSelectedPortions(defaultPortions);
    setSelectedPortionCounts(defaultPortionCounts);
    setSelectedItemsToLog(defaultSelectedItems);
    setActiveResolvedItem(null);
    setShowManualSearch(false);

    if (detectedItems.length > 1) {
      setScanMessage(
        `Detected ${detectedItems.length} items. Review each portion before logging.`
      );
    } else {
      setScanMessage(`Matched ${resolution.label}. Review the portion before logging.`);
    }
  };

  const handleBarcodeScanned = async (result: BarcodeScanningResult) => {
    const data = result?.data;

    if (!data) return;
    if (scanLockRef.current) return;
    if (scanResult) return;

    if (lastBarcodeRef.current === data) return;

    scanLockRef.current = true;
    lastBarcodeRef.current = data;

    setIsResolving(true);
    setScanMessage('Looking up barcode in Open Food Facts...');

    try {
      const resolution = await resolveBarcodeScan(data);

      if (!resolution) {
        setScanMessage('No barcode match found. Try a photo or manual search.');

        setTimeout(() => {
          scanLockRef.current = false;
          lastBarcodeRef.current = null;
        }, 1500);

        return;
      }

      applyResolution(resolution);
    } catch (error) {
      console.error('Barcode resolution failed:', error);
      setScanMessage('Barcode lookup failed. You can try a photo or manual search.');

      setTimeout(() => {
        scanLockRef.current = false;
        lastBarcodeRef.current = null;
      }, 1500);
    } finally {
      setIsResolving(false);
    }
  };

  const handleTakePhoto = async () => {
    if (!cameraRef.current || isResolving || !isCameraReady) {
      Alert.alert('Camera not ready', 'Please wait a second and try again.');
      return;
    }

    setIsResolving(true);
    setScanMessage('Analyzing food photo with Gemini...');

    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.75,
        skipProcessing: false,
      });

      if (!photo?.base64 || !photo?.uri) {
        throw new Error('Missing camera image data.');
      }

      setCapturedImageUri(photo.uri);

      const resolution = await resolveImageScan({
        imageBase64: photo.base64,
        imageUri: photo.uri,
      });

      if (!resolution) {
        throw new Error('No food detected from image.');
      }

      applyResolution(resolution);
    } catch (error) {
      console.error('Photo scan failed:', error);
      setCapturedImageUri(null);
      setScanMessage('Photo scan failed. Try again or use manual search.');
      Alert.alert('Scan failed', 'We could not analyze that image. Please try again.');
    } finally {
      setIsResolving(false);
    }
  };

  const handleSelectManualResult = (resolution: ScanResolution) => {
    applyResolution(resolution);
    setManualQuery(resolution.label);
  };

  const handleSaveFood = async () => {
    if (!user?.id) {
      Alert.alert('Sign in required', 'Please sign in to log food.');
      return;
    }

    if (!scanResult) {
      Alert.alert('No food selected', 'Please scan or choose a food first.');
      return;
    }

    setIsSaving(true);

    try {
      const dateString = new Date().toISOString().split('T')[0];
      const detectedItems = getDetectedItems(scanResult);
      const itemsToLog = detectedItems.filter(
        item => selectedItemsToLog[item.id] !== false
      );

      if (itemsToLog.length === 0) {
        Alert.alert('Select at least one item', 'Choose at least one detected item to log.');
        return;
      }

      for (const item of itemsToLog) {
        const selected = selectedPortions[item.id] || item.basePortionCategory;

        const resolvedItem = await resolveDetectedItemForPortion({
          item,
          portionCategory: selected,
          source: scanResult.source,
          analysis: scanResult.analysis,
        });

        const quantity = Math.max(1, selectedPortionCounts[item.id] || 1);
        const finalizedItem = applyQuantityMultiplier(resolvedItem, quantity);

        await addFoodLog(user.id, dateString, finalizedItem.foodData);
      }

      setShowSaveSuccess(true);
      setScanMessage('Food logged successfully. Redirecting to home...');

      setTimeout(() => {
        router.replace('/(tabs)/home');
      }, 650);
    } catch (error) {
      console.error('Failed to save scanned food:', error);
      Alert.alert('Save failed', 'Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleUseDescriptor = (descriptor: string) => {
    setManualQuery(descriptor);
    setShowManualSearch(true);
    // Smooth scroll to manual search
    // (In a real app we might use a ref, but scrollToEnd is fine for demo)
  };

  const requestCameraAccess = async () => {
    const result = await requestPermission();

    if (!result.granted) {
      Alert.alert(
        'Camera permission needed',
        'Please allow camera access to scan barcodes and food photos.'
      );
    }
  };

  const detectedItems = useMemo(() => {
    if (!scanResult) return [] as ScanDetectedItem[];
    return getDetectedItems(scanResult);
  }, [scanResult]);

  const activeItem = useMemo(() => {
    if (detectedItems.length === 0) return null;

    return (
      detectedItems.find(item => item.id === selectedItemId) || detectedItems[0]
    );
  }, [detectedItems, selectedItemId]);

  const activeItemPortion: PortionCategory = activeItem
    ? selectedPortions[activeItem.id] || activeItem.basePortionCategory
    : 'medium';

  const activeItemQuantity = activeItem
    ? Math.max(1, selectedPortionCounts[activeItem.id] || 1)
    : 1;

  const scaledActiveItem = useMemo(() => {
    if (!activeItem) return null;
    return scaleDetectedItemForPortion(activeItem, activeItemPortion);
  }, [activeItem, activeItemPortion]);

  useEffect(() => {
    let cancelled = false;

    const resolveActiveNutrition = async () => {
      if (!activeItem || !scanResult) {
        setActiveResolvedItem(null);
        setIsResolvingPortionNutrition(false);
        return;
      }

      setIsResolvingPortionNutrition(true);

      try {
        const resolved = await resolveDetectedItemForPortion({
          item: activeItem,
          portionCategory: activeItemPortion,
          source: scanResult.source,
          analysis: scanResult.analysis,
        });

        if (!cancelled) {
          setActiveResolvedItem(resolved);
        }
      } catch (error) {
        console.error('Portion nutrition fallback used:', error);

        if (!cancelled) {
          setActiveResolvedItem(
            scaleDetectedItemForPortion(activeItem, activeItemPortion)
          );
        }
      } finally {
        if (!cancelled) {
          setIsResolvingPortionNutrition(false);
        }
      }
    };

    resolveActiveNutrition();

    return () => {
      cancelled = true;
    };
  }, [activeItem, activeItemPortion, scanResult]);

  const displayedActiveItem = useMemo(() => {
    if (!scaledActiveItem) return null;

    if (
      activeResolvedItem &&
      activeItem &&
      activeResolvedItem.id === activeItem.id &&
      activeResolvedItem.portionCategory === activeItemPortion
    ) {
      return applyQuantityMultiplier(activeResolvedItem, activeItemQuantity);
    }

    return applyQuantityMultiplier(scaledActiveItem, activeItemQuantity);
  }, [
    scaledActiveItem,
    activeResolvedItem,
    activeItem,
    activeItemPortion,
    activeItemQuantity,
  ]);

  const activePortionOptions = useMemo(() => {
    if (!activeItem) return ['medium'] as PortionCategory[];

    return activeItem.portionOptions?.length > 0
      ? activeItem.portionOptions
      : [activeItem.basePortionCategory];
  }, [activeItem]);

  const selectedItemsCount = useMemo(() => {
    return detectedItems.filter(item => selectedItemsToLog[item.id] !== false).length;
  }, [detectedItems, selectedItemsToLog]);

  const totalMealMacros = useMemo(() => {
    const selected = detectedItems.filter(item => selectedItemsToLog[item.id] !== false);
    
    // Start with 0s
    let calories = 0, carbs = 0, protein = 0, fat = 0;

    // Use current displayed nutrition for active item, and base nutrition for others
    // (In a perfect world we'd resolve all items, but this is a good approximation)
    selected.forEach(item => {
      if (item.id === activeItem?.id && displayedActiveItem) {
        calories += displayedActiveItem.foodData.calories;
        carbs += displayedActiveItem.foodData.carbs;
        protein += displayedActiveItem.foodData.protein;
        fat += displayedActiveItem.foodData.fat;
      } else {
        const portion = selectedPortions[item.id] || item.basePortionCategory;
        const qty = selectedPortionCounts[item.id] || 1;
        const scaled = scaleDetectedItemForPortion(item, portion);
        calories += Math.round(scaled.foodData.calories * qty);
        carbs += Math.round(scaled.foodData.carbs * qty);
        protein += Math.round(scaled.foodData.protein * qty);
        fat += Math.round(scaled.foodData.fat * qty);
      }
    });

    return { calories, carbs, protein, fat };
  }, [detectedItems, selectedItemsToLog, activeItem, displayedActiveItem, selectedPortions, selectedPortionCounts]);

  const speakSummary = () => {
    if (!displayedActiveItem) return;

    const { label, foodData } = displayedActiveItem;

    const text = `I've detected ${label}. It has approximately ${foodData.calories} calories, ${foodData.protein} grams of protein, and ${foodData.carbs} grams of carbohydrates.`;

    Speech.speak(text, {
      rate: 0.9,
      pitch: 1.0,
    });
  };

  const renderManualResult = ({ item }: { item: ScanResolution }) => {
    return (
      <Pressable
        style={styles.resultCard}
        onPress={() => handleSelectManualResult(item)}
      >
        <View style={styles.resultRow}>
          <View style={styles.resultTextBlock}>
            <Text style={styles.resultTitle} numberOfLines={1}>
              {item.label}
            </Text>

            <Text style={styles.resultSubtitle} numberOfLines={1}>
              {item.subtitle || 'Open Food Facts result'}
            </Text>
          </View>

          <View
            style={[
              styles.confidencePill,
              { borderColor: confidenceColor(item.confidence) },
            ]}
          >
            <Text
              style={[
                styles.confidenceText,
                { color: confidenceColor(item.confidence) },
              ]}
            >
              {confidenceLabel(item.confidence)}
            </Text>
          </View>
        </View>

        <Text style={styles.resultMacros}>{formatMacros(item.foodData)}</Text>
      </Pressable>
    );
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={Colors.PRIMARY} />
          <Text style={styles.loadingText}>Preparing camera...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.permissionCard}>
          <Ionicons name="camera-outline" size={48} color={Colors.PRIMARY} />

          <Text style={styles.permissionTitle}>Camera access required</Text>

          <Text style={styles.permissionText}>
            Allow camera access to scan barcodes or capture food photos.
          </Text>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={requestCameraAccess}
          >
            <Text style={styles.primaryButtonText}>Allow camera access</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.back()}
          >
            <Text style={styles.secondaryButtonText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex1}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons
              name="chevron-back"
              size={22}
              color={Colors.TEXT_MAIN}
            />
          </TouchableOpacity>

          <View style={styles.headerTextBlock}>
            <Text style={styles.headerTitle}>Scan Food</Text>
            <Text style={styles.headerSubtitle}>{scanMessage}</Text>
          </View>

          <TouchableOpacity onPress={resetScan} style={styles.resetButton}>
            <Ionicons name="refresh" size={20} color={Colors.PRIMARY} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {showSaveSuccess ? (
            <View style={styles.successBanner}>
              <Ionicons
                name="checkmark-circle"
                size={18}
                color={Colors.PRIMARY}
              />
              <Text style={styles.successBannerText}>Saved to your log</Text>
            </View>
          ) : null}

          <View style={styles.modeRow}>
            <TouchableOpacity
              style={[styles.modeChip, mode === 'barcode' && styles.modeChipActive]}
              onPress={() => {
                setMode('barcode');
                setScanMessage('Align the barcode inside the frame.');
              }}
              disabled={isResolving}
            >
              <Ionicons
                name="barcode-outline"
                size={18}
                color={mode === 'barcode' ? Colors.PRIMARY : Colors.TEXT_MUTED}
              />
              <Text
                style={[
                  styles.modeChipText,
                  mode === 'barcode' && styles.modeChipTextActive,
                ]}
              >
                Barcode
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modeChip, mode === 'photo' && styles.modeChipActive]}
              onPress={() => {
                setMode('photo');
                setScanMessage('Capture the food clearly in the frame.');
              }}
              disabled={isResolving}
            >
              <Ionicons
                name="camera-outline"
                size={18}
                color={mode === 'photo' ? Colors.PRIMARY : Colors.TEXT_MUTED}
              />
              <Text
                style={[
                  styles.modeChipText,
                  mode === 'photo' && styles.modeChipTextActive,
                ]}
              >
                Photo
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.cameraCard}>
            {capturedImageUri ? (
              <Image
                source={{ uri: capturedImageUri }}
                style={styles.previewImage}
                resizeMode="cover"
              />
            ) : shouldShowCamera && isFocused ? (
              <CameraView
                ref={cameraRef}
                style={styles.camera}
                facing="back"
                onCameraReady={() => setIsCameraReady(true)}
                onBarcodeScanned={
                  mode === 'barcode' && !scanLockRef.current && !scanResult
                    ? handleBarcodeScanned
                    : undefined
                }
                barcodeScannerSettings={
                  mode === 'barcode'
                    ? {
                        barcodeTypes: [
                          'ean13',
                          'ean8',
                          'upc_a',
                          'upc_e',
                          'qr',
                          'code128',
                          'code39',
                        ],
                      }
                    : undefined
                }
              />
            ) : (
              <View style={styles.cameraPausedPlaceholder}>
                <Ionicons
                  name="pause-circle-outline"
                  size={40}
                  color="#9CA3AF"
                />
                <Text style={styles.cameraPausedText}>
                  Camera paused while reviewing results
                </Text>
              </View>
            )}

            {!capturedImageUri && shouldShowCamera && isFocused ? (
              <View pointerEvents="none" style={styles.cameraOverlay}>
                <View style={styles.scanFrame} />
                <Text style={styles.cameraHint}>
                  {mode === 'barcode'
                    ? 'Align the barcode inside the frame'
                    : 'Capture the food clearly in the frame'}
                </Text>
              </View>
            ) : null}
          </View>

          {isResolving ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator color={Colors.PRIMARY} />
              <View style={styles.skeletonLineLarge} />
              <View style={styles.skeletonLineSmall} />
            </View>
          ) : null}

          <View style={styles.actionsRow}>
            {mode === 'photo' ? (
              <TouchableOpacity
                style={[
                  styles.captureButton,
                  (isResolving || !isCameraReady) && { opacity: 0.7 },
                ]}
                onPress={handleTakePhoto}
                disabled={isResolving || !isCameraReady}
              >
                {isResolving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.captureButtonText}>
                    {isCameraReady ? 'Capture Photo' : 'Preparing Camera...'}
                  </Text>
                )}
              </TouchableOpacity>
            ) : (
              <View style={styles.scanHintCard}>
                <Ionicons
                  name="barcode-outline"
                  size={18}
                  color={Colors.PRIMARY}
                />
                <Text style={styles.scanHintText}>
                  The scanner will detect a barcode automatically.
                </Text>
              </View>
            )}
          </View>

          {scanResult && displayedActiveItem ? (
            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <View style={styles.summaryTitleBlock}>
                  <Text style={styles.summaryLabel}>
                    {scanResult.isCombination ? '🍛 COMBINATION MEAL DETECTED' : 'We think this is your meal'}
                  </Text>

                  <Text style={styles.summaryTitle}>
                    {scanResult.mealLabel || displayedActiveItem.label}
                  </Text>

                  <Text style={styles.summarySubtitle}>
                    {scanResult.subtitle ||
                      'Review each item and portion, then log the full meal.'}
                  </Text>

                  {/* Explain the Match Fallback Hint */}
                  {(displayedActiveItem.confidence < 0.5 || displayedActiveItem.label.toLowerCase().includes('unknown')) && (displayedActiveItem.visualDescriptor || scanResult.visualDescriptor) && (
                    <TouchableOpacity 
                      style={[styles.fallbackHintCard, { backgroundColor: theme.primary + '10' }]}
                      onPress={() => handleUseDescriptor(displayedActiveItem.visualDescriptor || scanResult.visualDescriptor || '')}
                    >
                      <View style={styles.fallbackHintIcon}>
                        <Ionicons name="bulb" size={16} color={theme.primary} />
                      </View>
                      <View style={styles.fallbackHintContent}>
                        <Text style={[styles.fallbackHintText, { color: theme.text }]}>
                          Not fully confident—try searching for:
                        </Text>
                        <Text style={[styles.fallbackDescriptor, { color: theme.primary }]}>
                          "{displayedActiveItem.visualDescriptor || scanResult.visualDescriptor}"
                        </Text>
                      </View>
                      <Ionicons name="arrow-forward" size={14} color={theme.primary} />
                    </TouchableOpacity>
                  )}
                </View>

                <View style={{ alignItems: 'flex-end', gap: 8 }}>
                  <View
                    style={[
                      styles.summaryConfidence,
                      {
                        borderColor: confidenceColor(
                          displayedActiveItem.confidence
                        ),
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.summaryConfidenceText,
                        {
                          color: confidenceColor(displayedActiveItem.confidence),
                        },
                      ]}
                    >
                      {confidenceLabel(displayedActiveItem.confidence)}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: theme.primary + '20',
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 8,
                      gap: 4,
                    }}
                    onPress={speakSummary}
                  >
                    <Ionicons
                      name="volume-medium"
                      size={16}
                      color={theme.primary}
                    />
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: '700',
                        color: theme.primary,
                      }}
                    >
                      LISTEN AI
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {(scanResult.imageUri || scanResult.productImageUrl) ? (
                <Image
                  source={{
                    uri:
                      scanResult.imageUri ||
                      scanResult.productImageUrl ||
                      undefined,
                  }}
                  style={styles.summaryImage}
                  resizeMode="cover"
                />
              ) : null}

              {detectedItems.length > 1 ? (
                <View style={styles.detectedItemsSection}>
                  <Text style={styles.sectionLabel}>Detected items</Text>

                  <View style={styles.detectedItemsGrid}>
                    {detectedItems.map((item, index) => (
                      <View
                        key={item.id}
                        style={[
                          styles.detectedItemChip,
                          activeItem?.id === item.id &&
                            styles.detectedItemChipActive,
                        ]}
                      >
                        <TouchableOpacity
                          style={styles.detectedItemSelectRow}
                          onPress={() => setSelectedItemId(item.id)}
                        >
                          <Text
                            style={[
                              styles.detectedItemChipText,
                              activeItem?.id === item.id &&
                                styles.detectedItemChipTextActive,
                            ]}
                            numberOfLines={1}
                          >
                            {index + 1}. {item.label}
                            {item.detectedQuantity > 1
                              ? ` (x${item.detectedQuantity})`
                              : ''}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.logToggleButton}
                          onPress={() => {
                            setSelectedItemsToLog(prev => ({
                              ...prev,
                              [item.id]: !(prev[item.id] !== false),
                            }));
                          }}
                        >
                          <Ionicons
                            name={
                              selectedItemsToLog[item.id] !== false
                                ? 'checkbox'
                                : 'square-outline'
                            }
                            size={18}
                            color={
                              selectedItemsToLog[item.id] !== false
                                ? Colors.PRIMARY
                                : Colors.TEXT_MUTED
                            }
                          />

                          <Text style={styles.logToggleText}>Log</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}

              <View style={styles.portionSection}>
                <Text style={styles.sectionLabel}>
                  {scanResult.isCombination ? 'Review items in this combo' : `Portion preset for ${displayedActiveItem.label}`}
                </Text>

                <View style={styles.portionGrid}>
                  {activePortionOptions.map(portion => (
                    <TouchableOpacity
                      key={portion}
                      style={[
                        styles.portionChip,
                        activeItemPortion === portion && styles.portionChipActive,
                      ]}
                      onPress={() => {
                        if (!activeItem) return;

                        setSelectedPortions(prev => ({
                          ...prev,
                          [activeItem.id]: portion,
                        }));

                        setSelectedPortionCounts(prev => ({
                          ...prev,
                          [activeItem.id]: Math.max(
                            1,
                            prev[activeItem.id] ||
                              activeItem.detectedQuantity ||
                              1
                          ),
                        }));
                      }}
                    >
                      <Text
                        style={[
                          styles.portionChipText,
                          activeItemPortion === portion &&
                            styles.portionChipTextActive,
                        ]}
                      >
                        {portionLabels[portion]}
                      </Text>

                      <Text
                        style={[
                          styles.portionChipHint,
                          activeItemPortion === portion &&
                            styles.portionChipHintActive,
                        ]}
                      >
                        {portionHelpers[portion]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.quantityAdjusterRow}>
                  <Text style={styles.quantityAdjusterLabel}>Quantity</Text>

                  <View style={styles.quantityStepper}>
                    <TouchableOpacity
                      style={styles.quantityStepButton}
                      onPress={() => {
                        if (!activeItem) return;

                        setSelectedPortionCounts(prev => ({
                          ...prev,
                          [activeItem.id]: Math.max(
                            1,
                            (prev[activeItem.id] ||
                              activeItem.detectedQuantity ||
                              1) - 1
                          ),
                        }));
                      }}
                    >
                      <Ionicons
                        name="remove"
                        size={16}
                        color={Colors.TEXT_MAIN}
                      />
                    </TouchableOpacity>

                    <Text style={styles.quantityValueText}>
                      {activeItemQuantity}
                    </Text>

                    <TouchableOpacity
                      style={styles.quantityStepButton}
                      onPress={() => {
                        if (!activeItem) return;

                        setSelectedPortionCounts(prev => ({
                          ...prev,
                          [activeItem.id]: Math.min(
                            10,
                            (prev[activeItem.id] ||
                              activeItem.detectedQuantity ||
                              1) + 1
                          ),
                        }));
                      }}
                    >
                      <Ionicons
                        name="add"
                        size={16}
                        color={Colors.TEXT_MAIN}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.logButton, isSaving && { opacity: 0.7 }]}
                onPress={handleSaveFood}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.logButtonText}>
                    {detectedItems.length > 1
                      ? `Looks right, log ${
                          detectedItems.filter(
                            item => selectedItemsToLog[item.id] !== false
                          ).length
                        } items`
                      : 'Looks right, log it'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          ) : null}

          {scanResult ? (
            <View style={styles.nutritionOverviewCard}>
              <View style={styles.nutritionOverviewHeader}>
                <View>
                  <Text style={styles.nutritionOverviewTitle}>
                    {selectedItemsCount > 1 ? 'Total Meal Nutrition' : 'Nutrition Information'}
                  </Text>

                  <Text style={styles.nutritionOverviewSubtitle}>
                    {selectedItemsCount > 1 
                      ? `${selectedItemsCount} items combined • Total estimate`
                      : displayedActiveItem
                        ? `${displayedActiveItem.label} • ${activeItemPortion} • Qty ${activeItemQuantity}`
                        : 'Scan or search a food to see nutrition details'}
                  </Text>
                </View>

                {isResolvingPortionNutrition ? (
                  <ActivityIndicator size="small" color={Colors.PRIMARY} />
                ) : (
                  <Ionicons
                    name="nutrition-outline"
                    size={18}
                    color={Colors.PRIMARY}
                  />
                )}
              </View>

              <View style={styles.nutritionMetricsRow}>
                <View style={styles.nutritionMetricPill}>
                  <Text style={styles.nutritionMetricLabel}>Calories</Text>
                  <Text style={styles.nutritionMetricValue}>
                    {displayNutritionValue(totalMealMacros.calories)} kcal
                  </Text>
                </View>

                <View style={styles.nutritionMetricPill}>
                  <Text style={styles.nutritionMetricLabel}>Carbs</Text>
                  <Text style={styles.nutritionMetricValue}>
                    {displayNutritionValue(totalMealMacros.carbs)}g
                  </Text>
                </View>
              </View>

              <View style={styles.nutritionMetricsRow}>
                <View style={styles.nutritionMetricPill}>
                  <Text style={styles.nutritionMetricLabel}>Protein</Text>
                  <Text style={styles.nutritionMetricValue}>
                    {displayNutritionValue(totalMealMacros.protein)}g
                  </Text>
                </View>

                <View style={styles.nutritionMetricPill}>
                  <Text style={styles.nutritionMetricLabel}>Fat</Text>
                  <Text style={styles.nutritionMetricValue}>
                    {displayNutritionValue(totalMealMacros.fat)}g
                  </Text>
                </View>
              </View>

              <Text style={styles.nutritionInfoHint}>
                {scanResult?.source === 'gemini'
                  ? 'For complex preset changes, Gemini fallback refines nutrition for the selected portion.'
                  : 'Nutrition is shown from the selected result and portion.'}
              </Text>
            </View>
          ) : null}

          {scanResult ? (
            <TouchableOpacity
              style={styles.manualToggleButton}
              onPress={() => setShowManualSearch(prev => !prev)}
            >
              <Text style={styles.manualToggleText}>
                {showManualSearch ? 'Hide manual search' : 'Or search manually'}
              </Text>

              <Ionicons
                name={showManualSearch ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={Colors.TEXT_MUTED}
              />
            </TouchableOpacity>
          ) : null}

          {!scanResult || showManualSearch ? (
            <View style={styles.manualSearchCard}>
              <Text style={styles.sectionLabel}>Manual search</Text>

              <TextInput
                style={styles.searchInput}
                placeholder="Search by product name or food name"
                placeholderTextColor={Colors.TEXT_MUTED}
                value={manualQuery}
                onChangeText={setManualQuery}
              />

              {manualSearchLoading ? (
                <View style={styles.manualLoading}>
                  <ActivityIndicator color={Colors.PRIMARY} />
                  <Text style={styles.manualLoadingText}>
                    Searching Open Food Facts...
                  </Text>
                </View>
              ) : null}

              {!manualSearchLoading &&
              manualResults.length === 0 &&
              manualQuery.trim().length >= 2 ? (
                <Text style={styles.manualEmptyText}>
                  No manual matches yet. Try a different query.
                </Text>
              ) : null}

              <View style={styles.manualResultsList}>
                {manualResults.map(item => (
                  <View key={item.id}>{renderManualResult({ item })}</View>
                ))}
              </View>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ScanFoodScreen;

const getStyles = (theme: ThemeType) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: Colors.BACKGROUND,
    },
    flex1: {
      flex: 1,
    },
    loadingState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },
    loadingText: {
      color: Colors.TEXT_MUTED,
      fontSize: 15,
      fontWeight: '600',
    },
    permissionCard: {
      flex: 1,
      margin: 20,
      padding: 24,
      backgroundColor: Colors.SURFACE_ELEVATED,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 14,
      borderWidth: 1,
      borderColor: Colors.BORDER,
    },
    permissionTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: Colors.TEXT_MAIN,
    },
    permissionText: {
      textAlign: 'center',
      color: Colors.TEXT_MUTED,
      lineHeight: 22,
    },
    primaryButton: {
      width: '100%',
      backgroundColor: Colors.PRIMARY,
      borderRadius: 18,
      paddingVertical: 14,
      alignItems: 'center',
    },
    primaryButtonText: {
      color: '#fff',
      fontWeight: '800',
    },
    secondaryButton: {
      width: '100%',
      backgroundColor: Colors.SURFACE_DARK,
      borderRadius: 18,
      paddingVertical: 14,
      alignItems: 'center',
    },
    secondaryButtonText: {
      color: Colors.TEXT_MAIN,
      fontWeight: '700',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 10,
      gap: 12,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.card,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTextBlock: {
      flex: 1,
      marginLeft: 12,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.text,
    },
    headerSubtitle: {
      fontSize: 12,
      color: theme.textMuted,
      marginTop: 2,
    },
    resetButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.card,
      justifyContent: 'center',
      alignItems: 'center',
    },
    content: {
      padding: 16,
    },
    successBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.primary + '20',
      padding: 10,
      borderRadius: 10,
      marginBottom: 16,
      gap: 8,
    },
    successBannerText: {
      color: theme.primary,
      fontSize: 13,
      fontWeight: '600',
    },
    modeRow: {
      flexDirection: 'row',
      marginBottom: 16,
      gap: 12,
    },
    modeChip: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      gap: 8,
    },
    modeChipActive: {
      backgroundColor: theme.primary + '10',
      borderColor: theme.primary,
    },
    modeChipText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.textMuted,
    },
    modeChipTextActive: {
      color: theme.primary,
    },
    cameraCard: {
      height: 300,
      borderRadius: 24,
      overflow: 'hidden',
      backgroundColor: '#000',
      marginBottom: 16,
      ...theme.shadow,
    },
    camera: {
      width: '100%',
      height: '100%',
    },
    previewImage: {
      width: '100%',
      height: '100%',
    },
    cameraPausedPlaceholder: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    cameraPausedText: {
      color: '#D1D5DB',
      fontWeight: '600',
    },
    cameraOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 18,
      backgroundColor: 'rgba(0,0,0,0.18)',
    },
    scanFrame: {
      width: '72%',
      height: 190,
      borderRadius: 28,
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.9)',
    },
    cameraHint: {
      marginTop: 14,
      color: '#fff',
      fontWeight: '700',
      textAlign: 'center',
      textShadowColor: 'rgba(0,0,0,0.65)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 4,
    },
    loadingCard: {
      backgroundColor: Colors.SURFACE_ELEVATED,
      borderRadius: 20,
      padding: 16,
      gap: 10,
      borderWidth: 1,
      borderColor: Colors.BORDER,
      marginBottom: 16,
    },
    skeletonLineLarge: {
      height: 12,
      width: '84%',
      borderRadius: 999,
      backgroundColor: Colors.BORDER,
    },
    skeletonLineSmall: {
      height: 10,
      width: '58%',
      borderRadius: 999,
      backgroundColor: Colors.BORDER,
    },
    actionsRow: {
      alignItems: 'center',
      marginBottom: 16,
    },
    captureButton: {
      width: '100%',
      backgroundColor: Colors.PRIMARY,
      borderRadius: 20,
      paddingVertical: 16,
      alignItems: 'center',
    },
    captureButtonText: {
      color: Colors.TEXT_MAIN,
      fontWeight: '800',
      fontSize: 16,
    },
    scanHintCard: {
      width: '100%',
      backgroundColor: Colors.SURFACE_ELEVATED,
      borderRadius: 18,
      paddingVertical: 14,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderWidth: 1,
      borderColor: Colors.BORDER,
    },
    scanHintText: {
      color: Colors.TEXT_MAIN,
      fontWeight: '600',
      flex: 1,
    },
    fallbackHintCard: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 12,
      padding: 12,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: Colors.PRIMARY + '30',
      gap: 10,
    },
    fallbackHintIcon: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: '#fff',
      justifyContent: 'center',
      alignItems: 'center',
    },
    fallbackHintContent: {
      flex: 1,
    },
    fallbackHintText: {
      fontSize: 11,
      fontWeight: '600',
      opacity: 0.8,
    },
    fallbackDescriptor: {
      fontSize: 13,
      fontWeight: '800',
      marginTop: 2,
    },
    nutritionOverviewCard: {
      backgroundColor: Colors.SURFACE_ELEVATED,
      borderRadius: 24,
      padding: 16,
      gap: 10,
      borderWidth: 1,
      borderColor: Colors.BORDER,
      marginTop: 16,
    },
    nutritionOverviewHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    nutritionOverviewTitle: {
      color: Colors.TEXT_MAIN,
      fontWeight: '900',
      fontSize: 16,
    },
    nutritionOverviewSubtitle: {
      marginTop: 2,
      color: Colors.TEXT_MUTED,
      fontSize: 12,
    },
    nutritionMetricsRow: {
      flexDirection: 'row',
      gap: 10,
    },
    nutritionMetricPill: {
      flex: 1,
      backgroundColor: Colors.SURFACE_DARK,
      borderRadius: 14,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: Colors.BORDER,
    },
    nutritionMetricLabel: {
      color: Colors.TEXT_MUTED,
      fontSize: 12,
      fontWeight: '600',
    },
    nutritionMetricValue: {
      marginTop: 2,
      color: Colors.TEXT_MAIN,
      fontSize: 16,
      fontWeight: '900',
    },
    nutritionInfoHint: {
      color: Colors.TEXT_MUTED,
      fontSize: 12,
      lineHeight: 18,
    },
    summaryCard: {
      backgroundColor: Colors.SURFACE_ELEVATED,
      borderRadius: 28,
      padding: 18,
      gap: 16,
      borderWidth: 1,
      borderColor: Colors.BORDER,
    },
    summaryHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },
    summaryTitleBlock: {
      flex: 1,
    },
    summaryLabel: {
      color: Colors.PRIMARY,
      fontWeight: '800',
      fontSize: 12,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    summaryTitle: {
      marginTop: 4,
      fontSize: 22,
      fontWeight: '900',
      color: Colors.TEXT_MAIN,
    },
    summarySubtitle: {
      marginTop: 4,
      color: Colors.TEXT_MUTED,
      lineHeight: 20,
    },
    summaryConfidence: {
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      backgroundColor: Colors.SURFACE,
    },
    summaryConfidenceText: {
      fontSize: 12,
      fontWeight: '800',
    },
    summaryImage: {
      width: '100%',
      height: 200,
      borderRadius: 22,
      backgroundColor: Colors.SURFACE_DARK,
    },
    detectedItemsSection: {
      gap: 10,
    },
    detectedItemsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    detectedItemChip: {
      backgroundColor: Colors.SURFACE_DARK,
      borderWidth: 1,
      borderColor: Colors.BORDER,
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 9,
      maxWidth: '100%',
      minWidth: '48%',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    detectedItemSelectRow: {
      flex: 1,
    },
    detectedItemChipActive: {
      backgroundColor: `${Colors.PRIMARY}15`,
      borderColor: Colors.PRIMARY,
    },
    detectedItemChipText: {
      color: Colors.TEXT_MAIN,
      fontWeight: '700',
    },
    detectedItemChipTextActive: {
      color: Colors.PRIMARY,
    },
    logToggleButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    logToggleText: {
      color: Colors.TEXT_MUTED,
      fontSize: 12,
      fontWeight: '700',
    },
    portionSection: {
      gap: 10,
    },
    sectionLabel: {
      fontSize: 15,
      fontWeight: '800',
      color: Colors.TEXT_MAIN,
    },
    portionGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    portionChip: {
      flexBasis: '48%',
      flexGrow: 1,
      backgroundColor: Colors.SURFACE_DARK,
      borderWidth: 1,
      borderColor: Colors.BORDER,
      borderRadius: 18,
      padding: 12,
      gap: 4,
    },
    portionChipActive: {
      backgroundColor: `${Colors.PRIMARY}15`,
      borderColor: Colors.PRIMARY,
    },
    portionChipText: {
      fontWeight: '800',
      color: Colors.TEXT_MAIN,
    },
    portionChipTextActive: {
      color: Colors.PRIMARY,
    },
    portionChipHint: {
      fontSize: 12,
      color: Colors.TEXT_MUTED,
    },
    portionChipHintActive: {
      color: Colors.PRIMARY,
    },
    quantityAdjusterRow: {
      marginTop: 4,
      backgroundColor: Colors.SURFACE_DARK,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: Colors.BORDER,
      paddingVertical: 10,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    quantityAdjusterLabel: {
      color: Colors.TEXT_MAIN,
      fontWeight: '700',
    },
    quantityStepper: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    quantityStepButton: {
      width: 28,
      height: 28,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: Colors.BORDER,
      backgroundColor: Colors.SURFACE,
      alignItems: 'center',
      justifyContent: 'center',
    },
    quantityValueText: {
      minWidth: 22,
      textAlign: 'center',
      color: Colors.TEXT_MAIN,
      fontSize: 16,
      fontWeight: '800',
    },
    logButton: {
      backgroundColor: Colors.PRIMARY,
      borderRadius: 20,
      paddingVertical: 16,
      alignItems: 'center',
    },
    logButtonText: {
      color: Colors.TEXT_MAIN,
      fontWeight: '800',
      fontSize: 16,
    },
    manualSearchCard: {
      backgroundColor: Colors.SURFACE_ELEVATED,
      borderRadius: 28,
      padding: 18,
      gap: 12,
      borderWidth: 1,
      borderColor: Colors.BORDER,
      marginTop: 16,
    },
    manualToggleButton: {
      backgroundColor: Colors.SURFACE,
      borderRadius: 16,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: Colors.BORDER,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 16,
    },
    manualToggleText: {
      color: Colors.TEXT_MAIN,
      fontWeight: '700',
    },
    searchInput: {
      borderWidth: 1,
      borderColor: Colors.BORDER,
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: Colors.TEXT_MAIN,
      fontSize: 15,
      backgroundColor: Colors.SURFACE_DARK,
    },
    manualLoading: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    manualLoadingText: {
      color: Colors.TEXT_MUTED,
      fontWeight: '600',
    },
    manualEmptyText: {
      color: Colors.TEXT_MUTED,
      fontSize: 13,
    },
    manualResultsList: {
      gap: 12,
    },
    resultCard: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: Colors.BORDER,
      backgroundColor: Colors.SURFACE,
      padding: 14,
      gap: 8,
    },
    resultRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },
    resultTextBlock: {
      flex: 1,
    },
    resultTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: Colors.TEXT_MAIN,
    },
    resultSubtitle: {
      marginTop: 3,
      color: Colors.TEXT_MUTED,
      fontSize: 12,
    },
    confidencePill: {
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    confidenceText: {
      fontSize: 11,
      fontWeight: '800',
    },
    resultMacros: {
      color: Colors.TEXT_MAIN,
      fontWeight: '700',
    },
  });