import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/Colors';

const { width } = Dimensions.get('window');
const VISIBLE_WIDTH = width;
const ITEM_WIDTH = VISIBLE_WIDTH / 7;

interface DateItem {
    id: string;
    date: Date;
    dayName: string;
    dayNumber: string;
    isToday: boolean;
}

interface WeeklyCalendarProps {
    selectedDate: Date;
    onDateSelect: (date: Date) => void;
}

export default function WeeklyCalendar({ selectedDate, onDateSelect }: WeeklyCalendarProps) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [dates, setDates] = useState<DateItem[]>([]);
    const flatListRef = useRef<FlatList>(null);

    useEffect(() => {
        generateDates();
    }, []);

    const generateDates = () => {
        const newDates: DateItem[] = [];
        const baseDate = new Date(today);

        const dayOfWeek = baseDate.getDay();
        const startOfCurrentWeek = new Date(baseDate);
        startOfCurrentWeek.setDate(baseDate.getDate() - dayOfWeek);
        startOfCurrentWeek.setHours(0, 0, 0, 0);

        const startRange = -7; 
        const endRange = 7; 

        for (let i = startRange; i < endRange; i++) {
            const d = new Date(startOfCurrentWeek);
            d.setDate(startOfCurrentWeek.getDate() + i);
            d.setHours(0, 0, 0, 0);

            const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
            const dayNumber = d.getDate().toString();
            const isToday = d.getTime() === today.getTime();

            newDates.push({
                id: d.toISOString(),
                date: d,
                dayName: dayName,
                dayNumber: dayNumber,
                isToday: isToday,
            });
        }
        setDates(newDates);

        setTimeout(() => {
            const currentWeekStartIndex = Math.abs(startRange);
            if (flatListRef.current) {
                flatListRef.current.scrollToIndex({
                    index: currentWeekStartIndex,
                    animated: false,
                    viewPosition: 0 
                });
            }
        }, 100);
    };

    const renderItem = ({ item }: { item: DateItem }) => {
        const isSelected = selectedDate.toDateString() === item.date.toDateString();

        return (
            <TouchableOpacity
                onPress={() => onDateSelect(item.date)}
                activeOpacity={0.7}
                style={[
                    styles.dateItem,
                    isSelected && styles.selectedDateItem
                ]}
            >
                <Text style={[
                    styles.dayName,
                    item.isToday && !isSelected && styles.todayText,
                    isSelected && styles.selectedDayNameText 
                ]}>
                    {item.dayName}
                </Text>
                <View style={[
                    styles.dateCircle,
                    item.isToday && !isSelected && styles.todayCircle,
                    isSelected && styles.selectedDateCircle,
                ]}>
                    <Text style={[
                        styles.dayNumber,
                        item.isToday && !isSelected && styles.todayText,
                        isSelected && styles.selectedText
                    ]}>
                        {item.dayNumber}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <FlatList
                ref={flatListRef}
                data={dates}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                pagingEnabled
                snapToInterval={VISIBLE_WIDTH}
                snapToAlignment="start"
                decelerationRate="fast"
                getItemLayout={(_, index) => ({
                    length: ITEM_WIDTH,
                    offset: ITEM_WIDTH * index,
                    index,
                })}
                scrollEventThrottle={16}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: VISIBLE_WIDTH,
        paddingVertical: 3,
        backgroundColor: Colors.BACKGROUND,
    },
    dateItem: {
        width: ITEM_WIDTH,
        alignItems: 'center',
        paddingVertical: 8,
        borderRadius: 14,
    },
    selectedDateItem: {
        backgroundColor: Colors.SURFACE,
        borderRadius: 14,
        paddingVertical: 8,
    },
    dayName: {
        fontSize: 12,
        fontWeight: '700',
        color: Colors.TEXT_MUTED,
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    selectedDayNameText: {
        color: Colors.PRIMARY,
    },
    dateCircle: {
        width: 44, height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    selectedDateCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.PRIMARY,
        borderWidth: 1,
        borderColor: Colors.PRIMARY,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: Colors.PRIMARY,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 4,
    },
    todayCircle: {
        borderWidth: 2,
        borderColor: Colors.PRIMARY,
    },
    dayNumber: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.TEXT_MAIN,
    },
    selectedText: {
        color: Colors.TEXT_INVERSE, 
    },
    todayText: {
        color: Colors.PRIMARY,
    },
});
