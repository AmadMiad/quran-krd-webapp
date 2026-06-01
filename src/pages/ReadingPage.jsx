import './ReadingPage.css'; 
import { Header } from '../components/header';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AudioPlayer } from '../components/AudioPlayer';

export function ReadingPage() {
    // 1. Initialize as NULL so we can easily check if data is loading
    const [surahData, setSurahData] = useState(null); 
    const [activeVerse, setActiveVerse] = useState(-1);
    const { id } = useParams();

    const toArabicNumerals = (n) => {
    return n.toString().replace(/\d/g, d => "٠١٢٣٤٥٦٧٨٩"[d]);
    };

    useEffect(() => {
        // This single API call fetches BOTH Arabic (index 0) and Kurdish (index 1)
        fetch(`http://api.alquran.cloud/v1/surah/${id}/editions/quran-uthmani,ku.asan`)
        .then(response => response.json())
        .then(data => {
            console.log('Data loaded:', data);
            setSurahData(data.data); // data.data is an Array of 2 items
        })
        .catch(error => console.error('Error loading data:', error))
    }, [id]); // Removed redundant second useEffect

const handleAudioVerseChange = (index) => {
        setActiveVerse(index); // 1. Highlight the text
        
        // 2. Find the HTML element for this verse
        const element = document.getElementById(`verse-${index}`);
        
        // 3. Scroll to it smoothly
        if (element) {
            element.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' // Put it in the middle of the screen
            });
        }
    };


    // 2. LOADING STATE: Prevent the crash by waiting for data
    if (!surahData) {
        return <div className='loading-screen'>Loading data...</div>;
    }

    // 3. Destructure for easier access
    const arabicSurah = surahData[0];
    const kurdishSurah = surahData[1];

    return (
        <div className="reading-page-wrapper">
            <Header />
            
            <div className="reading-paper">
                <div className="paper-header">
                    <button className="nav-arrow">←</button>
                    <div className="surah-title-box">
                        {/* Dynamic Title */}
                        <h2>{arabicSurah.name}</h2> 
                        <p>{arabicSurah.englishName}</p>
                    </div>
                    <button className="nav-arrow">→</button>
                </div>

                <div className="action-bar">
                    <button className="action-tag">▶ Play Audio</button>
                    <button className="action-tag active">Translation</button>
                </div>


                {arabicSurah.number !== 1 && arabicSurah.number !== 9 && (
                    <div className="bismillah">
                        بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
                    </div>
                )}

                <div className="verses-container">
                    {/* 4. MAP Logic */}
                    {arabicSurah.ayahs.map((arabicAyah, index) => {
                        // Get the matching Kurdish Ayah using the same index
                        const kurdishAyah = kurdishSurah.ayahs[index];

                        // 1. Define the exact Bismillah string returned by the API
                        const BISMILLAH = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ ";

                        // 2. Prepare the text to display
                        let displayText = arabicAyah.text;

                        // 3. If it's the FIRST verse, remove the Bismillah prefix
                        if (arabicAyah.numberInSurah === 1) {
                            displayText = displayText.replace(BISMILLAH, '').trim();
                            
                        }

                        // 4. SURAH 1 FIX: If removing Bismillah left the text empty (Surah Al-Fatiha),
                        // return null so we don't show an empty box (your header handles it).
                        if (displayText.length === 0) {
                            return null; 
                        }

                        return (
                            <div className="verse-block" id={`verse-${index}`} key={arabicAyah.number}>
                                <div className="arabic-text">
                                    {displayText}
                                    <span className="verse-number-symbol">
                                        {toArabicNumerals(arabicAyah.numberInSurah)}
                                    </span>
                                </div>
                                
                                <div className="kurdish-text">
                                    {/* 5. Dynamic Translation */}
                                    {kurdishAyah.text}
                                </div>
                                <div className="verse-divider"></div>
                            </div>
                        );
                    })}
                </div>
            </div>
            <AudioPlayer onVerseChange={handleAudioVerseChange}></AudioPlayer>
        </div>
    );
}