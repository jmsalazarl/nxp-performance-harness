import React from 'react';
import styles from './ValidationMessage.module.css';

interface ValidationMessageProps {
  message: string | null;
  fieldName?: string;
}

export const ValidationMessage: React.FC<ValidationMessageProps> = ({
  message,
  fieldName,
}) => {
  if (!message) {
    return null;
  }

  return (
    <div className={styles.container}>
      <span className={styles.icon}>⚠</span>
      <span className={styles.text}>
        {fieldName && <strong>{fieldName}: </strong>}
        {message}
      </span>
    </div>
  );
};
