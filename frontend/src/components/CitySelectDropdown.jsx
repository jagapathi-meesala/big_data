import React, { useState } from 'react';
import Select from 'react-select';

export const CITIES_DATA = [
  { value: 'Hyderabad', label: 'Hyderabad (Telangana)', state: 'Telangana', lat: 17.3850, lon: 78.4867 },
  { value: 'Vijayawada', label: 'Vijayawada (Andhra Pradesh)', state: 'Andhra Pradesh', lat: 16.5062, lon: 80.6480 },
  { value: 'Visakhapatnam', label: 'Visakhapatnam (Andhra Pradesh)', state: 'Andhra Pradesh', lat: 17.6868, lon: 83.2185 },
  { value: 'Warangal', label: 'Warangal (Telangana)', state: 'Telangana', lat: 17.9689, lon: 79.5941 },
  { value: 'Guntur', label: 'Guntur (Andhra Pradesh)', state: 'Andhra Pradesh', lat: 16.3067, lon: 80.4365 },
  { value: 'Karimnagar', label: 'Karimnagar (Telangana)', state: 'Telangana', lat: 18.4386, lon: 79.1288 },
  { value: 'Khammam', label: 'Khammam (Telangana)', state: 'Telangana', lat: 17.2473, lon: 80.1514 },
  { value: 'Nalgonda', label: 'Nalgonda (Telangana)', state: 'Telangana', lat: 17.0575, lon: 79.2684 },
  { value: 'Nizamabad', label: 'Nizamabad (Telangana)', state: 'Telangana', lat: 18.6725, lon: 78.0941 },
  { value: 'Kurnool', label: 'Kurnool (Andhra Pradesh)', state: 'Andhra Pradesh', lat: 15.8281, lon: 78.0373 },
  { value: 'Anantapur', label: 'Anantapur (Andhra Pradesh)', state: 'Andhra Pradesh', lat: 14.6819, lon: 77.6006 },
  { value: 'Rajahmundry', label: 'Rajahmundry (Andhra Pradesh)', state: 'Andhra Pradesh', lat: 16.9891, lon: 81.7810 },
  { value: 'Tirupati', label: 'Tirupati (Andhra Pradesh)', state: 'Andhra Pradesh', lat: 13.6284, lon: 79.4192 },
  { value: 'Nellore', label: 'Nellore (Andhra Pradesh)', state: 'Andhra Pradesh', lat: 14.4426, lon: 79.9865 },
  { value: 'Kakinada', label: 'Kakinada (Andhra Pradesh)', state: 'Andhra Pradesh', lat: 16.9891, lon: 82.2475 },
  { value: 'Kadapa', label: 'Kadapa (Andhra Pradesh)', state: 'Andhra Pradesh', lat: 14.4673, lon: 78.8242 },
  { value: 'Eluru', label: 'Eluru (Andhra Pradesh)', state: 'Andhra Pradesh', lat: 16.7107, lon: 81.1035 },
  { value: 'Srikakulam', label: 'Srikakulam (Andhra Pradesh)', state: 'Andhra Pradesh', lat: 18.2941, lon: 83.8963 },
  { value: 'Vizianagaram', label: 'Vizianagaram (Andhra Pradesh)', state: 'Andhra Pradesh', lat: 18.1124, lon: 83.3956 },
  { value: 'Mahbubnagar', label: 'Mahbubnagar (Telangana)', state: 'Telangana', lat: 16.7488, lon: 77.9856 },
  { value: 'Adilabad', label: 'Adilabad (Telangana)', state: 'Telangana', lat: 19.6641, lon: 78.5320 },
  { value: 'Suryapet', label: 'Suryapet (Telangana)', state: 'Telangana', lat: 17.1500, lon: 79.6200 },
  { value: 'Siddipet', label: 'Siddipet (Telangana)', state: 'Telangana', lat: 18.1018, lon: 78.8520 },
  { value: 'Sangareddy', label: 'Sangareddy (Telangana)', state: 'Telangana', lat: 17.6167, lon: 78.0833 },
  { value: 'Bhadrachalam', label: 'Bhadrachalam (Telangana)', state: 'Telangana', lat: 17.6700, lon: 80.8900 },
  { value: 'Ongole', label: 'Ongole (Andhra Pradesh)', state: 'Andhra Pradesh', lat: 15.5057, lon: 80.0499 },
  { value: 'Machilipatnam', label: 'Machilipatnam (Andhra Pradesh)', state: 'Andhra Pradesh', lat: 16.1812, lon: 81.1363 },
  { value: 'Tenali', label: 'Tenali (Andhra Pradesh)', state: 'Andhra Pradesh', lat: 16.2430, lon: 80.6400 },
  { value: 'Proddatur', label: 'Proddatur (Andhra Pradesh)', state: 'Andhra Pradesh', lat: 14.7500, lon: 78.5500 },
  { value: 'Hindupur', label: 'Hindupur (Andhra Pradesh)', state: 'Andhra Pradesh', lat: 13.8300, lon: 77.4900 },
  { value: 'Nandyal', label: 'Nandyal (Andhra Pradesh)', state: 'Andhra Pradesh', lat: 15.4800, lon: 78.4800 },
  { value: 'Chittoor', label: 'Chittoor (Andhra Pradesh)', state: 'Andhra Pradesh', lat: 13.2172, lon: 79.1003 },
  { value: 'Ramagundam', label: 'Ramagundam (Telangana)', state: 'Telangana', lat: 18.8000, lon: 79.4500 },
  { value: 'Miryalaguda', label: 'Miryalaguda (Telangana)', state: 'Telangana', lat: 16.8700, lon: 79.5600 },
  { value: 'Mancherial', label: 'Mancherial (Telangana)', state: 'Telangana', lat: 18.8700, lon: 79.4600 },
  { value: 'Jagtial', label: 'Jagtial (Telangana)', state: 'Telangana', lat: 18.7900, lon: 78.9100 }
];

export const getCityCoords = (cityName) => {
  const city = CITIES_DATA.find((c) => c.value.toLowerCase() === (cityName || '').toLowerCase());
  if (city) return [city.lat, city.lon];
  return [17.3850, 78.4867];
};

export const CitySelectDropdown = ({ value, onChange, placeholder = 'Search city...', isDisabled, excludeValue }) => {
  const filteredOptions = excludeValue
    ? CITIES_DATA.filter((c) => c.value !== excludeValue)
    : CITIES_DATA;

  return (
    <div className="w-full text-left">
      <Select
        options={filteredOptions}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        isDisabled={isDisabled}
        isSearchable
        className="text-xs font-semibold"
        classNamePrefix="react-select"
        styles={{
          control: (base, state) => ({
            ...base,
            backgroundColor: '#0f172a',
            borderColor: state.isFocused ? '#10b981' : '#334155',
            borderRadius: '0.5rem',
            padding: '2px 4px',
            color: '#ffffff',
            boxShadow: state.isFocused ? '0 0 0 1px #10b981' : 'none',
            '&:hover': {
              borderColor: '#10b981',
            },
          }),
          menu: (base) => ({
            ...base,
            backgroundColor: '#1e293b',
            borderRadius: '0.75rem',
            border: '1px solid #334155',
            zIndex: 9999,
            overflow: 'hidden',
          }),
          option: (base, state) => ({
            ...base,
            backgroundColor: state.isSelected
              ? '#10b981'
              : state.isFocused
              ? '#334155'
              : '#1e293b',
            color: '#ffffff',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
            '&:active': {
              backgroundColor: '#059669',
            },
          }),
          singleValue: (base) => ({
            ...base,
            color: '#ffffff',
            fontWeight: 700,
          }),
          input: (base) => ({
            ...base,
            color: '#ffffff',
          }),
          placeholder: (base) => ({
            ...base,
            color: '#94a3b8',
          }),
        }}
      />
    </div>
  );
};

export default CitySelectDropdown;
