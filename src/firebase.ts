import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: 'AIzaSyCt8CyPWdI5O9sDOhU7AxmsQnnnVbulmcQ',
  authDomain: 'peptide-c7e91.firebaseapp.com',
  projectId: 'peptide-c7e91',
  storageBucket: 'peptide-c7e91.appspot.com',
  messagingSenderId: '934474605352',
  appId: '1:934474605352:web:webapp',
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
export default app
