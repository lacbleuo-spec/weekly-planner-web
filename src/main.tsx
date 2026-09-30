import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// 예전 버전은 매 변경마다 캔버스를 localStorage에 자동 저장해서 새로고침해도
// 이어졌었다. 지금은 파일(열기/저장)로만 관리하므로 그 흔적을 한 번 지운다.
localStorage.removeItem('weekboard/planning-store')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
