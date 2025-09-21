// components/LoginPage.jsx

import React from 'react';
import styles from './LoginPage.module.css';
import { ChartCandlestick } from 'lucide-react';

export default function LoginPage({ onSignIn }) {
  return (
    <div className={styles.loginPage}>
      <div className={styles.loginCard}>
        <h1 className={styles.title}>
          <ChartCandlestick size={48} className={styles.icon} />
          Foresight AI
        </h1>
        <p className={styles.tagline}>
            AI-powered market analysis for startups. Get insights in seconds.
        </p>
        <button className={styles.signInButton} onClick={onSignIn}>
          <img 
            src="https://www.gstatic.com/images/branding/product/2x/gsa_48dp.png" 
            alt="Google Logo" 
            className={styles.googleIcon}
          />
          Sign In with Google
        </button>
      </div>
    </div>
  );
}