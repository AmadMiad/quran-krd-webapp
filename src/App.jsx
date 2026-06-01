import { useEffect, useState } from "react"
import { HomePage } from "./pages/HomePage";
import { ReadingPage } from "./pages/ReadingPage";
import { Routes, Route } from 'react-router-dom'

function App() {
const [surah, setSurah] = useState([]);

useEffect(() => {
  fetch('https://api.alquran.cloud/v1/surah')
  .then(response => response.json())
  .then(data => {
    console.log('Data loaded:', data);
    setSurah(data.data);
  })
  .catch(error => console.error('Error loading data:', error))
}, [])
return (
  <Routes>
    <Route path="/" element={<HomePage surah={surah} />}></Route>
    <Route path="surah/:id" element = {<ReadingPage></ReadingPage>}></Route>
  </Routes>
)
}

export default App
