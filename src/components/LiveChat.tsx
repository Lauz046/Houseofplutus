import React, { useEffect, useRef, useState } from 'react';
import { useEnquiryPanel } from './EnquiryPanelContext';
import styles from './LiveChat.module.css';
import { sendEnquiry } from '../utils/sendEnquiry';

interface ChatMessage {
  from: 'bot' | 'user' | 'typing';
  text?: string;
}

const TYPING_DELAY = 1200;
const MESSAGE_DELAY = 900;

const LiveChat: React.FC = () => {
  const { product, closePanel } = useEnquiryPanel();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [step, setStep] = useState(0);
  const [showOptions, setShowOptions] = useState(false);
  const [contact, setContact] = useState('');
  const [inputError, setInputError] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const contactInputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom on new message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when step 2
  useEffect(() => {
    if (step === 2) {
      setTimeout(() => contactInputRef.current?.focus(), 200);
    }
  }, [step]);

  // Chat flow
  useEffect(() => {
    if (step === 0) {
      setMessages([{ from: 'typing' }]);
      setTimeout(() => {
        setMessages([
          { from: 'bot', text: 'Welcome to the House of Plutus! Would you like to send an enquiry for this product?' },
        ]);
        setShowOptions(true);
      }, TYPING_DELAY);
    }
    // After proceed
    if (step === 1) {
      setShowOptions(false);
      setMessages(prev => [
        ...prev,
        { from: 'typing' },
      ]);
      setTimeout(() => {
        setMessages(prev => [
          ...prev.slice(0, -1),
          { from: 'bot', text: `An enquiry for ${product?.name} (ID: ${product?.id}) has been sent.` },
          { from: 'typing' },
        ]);
        setTimeout(() => {
          setMessages(prev => [
            ...prev.slice(0, -1),
            { from: 'bot', text: 'Thank you for choosing House of Plutus. Our team will connect with you in 12–18 hours.' },
            { from: 'typing' },
          ]);
          setTimeout(() => {
            setMessages(prev => [
              ...prev.slice(0, -1),
              { from: 'bot', text: 'Please provide your email or phone number so our team can connect for further interaction.' },
            ]);
            setStep(2);
          }, TYPING_DELAY);
        }, TYPING_DELAY);
      }, MESSAGE_DELAY);
    }
    // After contact info submitted
    if (step === 3) {
      setMessages(prev => [
        ...prev,
        { from: 'user', text: contact },
        { from: 'typing' },
      ]);
      setLoading(true);
      sendEnquiry({
        productId: product?.id || '',
        productName: product?.name || '',
        productBrand: product?.brand || '',
        productImage: product?.image || '',
        contact,
        timestamp: new Date().toISOString(),
      })
        .then(() => {
          setLoading(false);
          setMessages(prev => [
            ...prev.slice(0, -1),
            { from: 'bot', text: 'Thank you! We have received your enquiry and contact details.' },
          ]);
          setToast('Enquiry sent successfully!');
          setTimeout(() => setToast(null), 3500);
        })
        .catch(() => {
          setLoading(false);
          setMessages(prev => [
            ...prev.slice(0, -1),
            { from: 'bot', text: 'Sorry, there was a problem sending your enquiry. Please try again.' },
          ]);
          setToast('Failed to send enquiry. Please try again.');
          setTimeout(() => setToast(null), 3500);
        });
    }
    // eslint-disable-next-line
  }, [step]);

  const handleProceed = () => setStep(1);
  const handleCancel = () => closePanel();

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contact.trim()) {
      setInputError('Please enter your email or phone number.');
      return;
    }
    setInputError('');
    setStep(3);
  };

  return (
    <div className={styles.chatWrap} aria-live="polite">
      <div className={styles.chatArea}>
        {messages.map((msg, i) =>
          msg.from === 'typing' ? (
            <div key={i} className={styles.typing} aria-label="Bot is typing"><span /><span /><span /></div>
          ) : (
            <div key={i} className={msg.from === 'bot' ? styles.botMsg : styles.userMsg}>{msg.text}</div>
          )
        )}
        {loading && (
          <div className={styles.loadingDots} aria-label="Sending...">
            <span />
            <span />
            <span />
          </div>
        )}
        <div ref={chatEndRef} />
      </div>
      {showOptions && (
        <div className={styles.optionsRow}>
          <button className={styles.proceedBtn} onClick={handleProceed} autoFocus>Proceed</button>
          <button className={styles.cancelBtn} onClick={handleCancel}>Cancel</button>
        </div>
      )}
      {step === 2 && (
        <form className={styles.contactForm} onSubmit={handleContactSubmit}>
          <input
            className={styles.contactInput}
            type="text"
            placeholder="Your email or phone number"
            value={contact}
            onChange={e => setContact(e.target.value)}
            ref={contactInputRef}
            aria-label="Your email or phone number"
          />
          <button className={styles.proceedBtn} type="submit" disabled={loading}>Send</button>
          {inputError && <div className={styles.inputError}>{inputError}</div>}
        </form>
      )}
      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  );
};

export default LiveChat; 