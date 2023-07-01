import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';

const CitySelecter = ({ onCitySelecter }) => {
  const [prefectures, setPrefectures] = useState([]);
  const [cityCode, setCityCode] = useState([]);
  const [selectedPrefecture, setSelectedPrefecture] = useState('');
  const [selectedCityCode, setSelectedCityCode] = useState('');

  useEffect(() => {
    Papa.parse('city-code.csv', {
      download: true,
      complete: (results) => {
        const data = results.data.map(([市区町村コード, 県名, 市区町村名]) => ({ 市区町村コード, 県名, 市区町村名 }));
        const prefs = [...new Set(data.map(item => item.県名))];
        setPrefectures(prefs);
        setCityCode(data);
      }
    });
  }, []);

  useEffect(() => {
    onCitySelecter(selectedCityCode);
  }, [selectedCityCode, onCitySelecter]);

  const handlePrefectureChange = (event) => {
    setSelectedPrefecture(event.target.value);
  };

  const handlecityCodeChange = (event) => {
    setSelectedCityCode(event.target.value);
  };

  const filteredCityCode = cityCode.filter(m => m.県名 === selectedPrefecture);

  return (
    <>
      
      <select value={selectedPrefecture} onChange={handlePrefectureChange}>
        <option value="">選択してください</option>
        {prefectures.map((pref, index) => <option key={index} value={pref}>{pref}</option>)}
      </select>
      
      <select value={selectedCityCode} onChange={handlecityCodeChange}>
        <option value="">選択してください</option>
        {filteredCityCode.map((m, index) => <option key={index} value={m.市区町村コード}>{m.市区町村名}</option>)}
      </select>
    </>
  );
};

export default CitySelecter;
