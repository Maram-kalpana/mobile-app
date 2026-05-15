import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, Text, View, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

/** Convert a Date to YYYY-MM-DD using LOCAL timezone (avoids UTC offset shift). */
function localDateStr(d) {
  if (!d) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function DatePickerField({ label = 'Date', value, onChange, style }) {
  const [show, setShow] = useState(false);

  const selectedDate = value ? new Date(value + 'T00:00:00') : new Date();

  return (
    <View style={style}>
      {label ? <Text style={{ marginBottom: 6 }}>{label}</Text> : null}

      {/* FIELD */}
      <Pressable
        onPress={() => setShow(true)}
        style={{
          height: 48,
          borderWidth: 1,
          borderRadius: 12,
          borderColor: '#ccc',
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 12,
          justifyContent: 'space-between',
        }}
      >
        <Text>
          {value || 'Select date'}
        </Text>

        <MaterialCommunityIcons name="calendar" size={20} color="#2563eb" />
      </Pressable>

      {/* REAL CALENDAR */}
      {show && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={(event, date) => {
            setShow(false);
            if (date) {
              const formatted = localDateStr(date);
              onChange(formatted);
            }
          }}
        />
      )}
    </View>
  );
}