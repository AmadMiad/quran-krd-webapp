import './HomePage.css'
import {Header} from '../components/header'
import { useNavigate } from 'react-router-dom'

export function HomePage({ surah }){
    const navigate = useNavigate();
return(
<>
    <Header />
            <div className="surah-grid">

                {surah.map((surah) => {
                return(
                    <div key={surah.number} className="surah-card" onClick={() => navigate(`/surah/${surah.number}`)}>
                        <div className="card-inner">
                            <div className="card-top">
                                <span className="number-badge">{ surah.number }</span>
                                <span className="revelation">{ surah.revelationType }</span>
                            </div>
                            <div className="card-content">
                                <h2 className="english-name">{ surah.name }</h2>
                                <h3 className="arabic-name">{ surah.englishName }</h3>
                                <p className="meaning">{ surah.englishNameTranslation }</p>
                            </div>
                            <div className="card-bottom">
                                <span className="verses">{ surah.numberOfAyahs }</span>
                            </div>
                            <div className="decoration-corner"></div>
                        </div>
                    </div>
                )
                })}

            </div>
</>
)
}
