import Icon from './Icon';

const ITEMS = [
  '14-day free trial',
  'No credit card required',
  'UPI, card & netbanking supported',
  'Web, mobile & PWA',
];

export default function TrustStrip() {
  return (
    <div className="trust-strip">
      <div className="container">
        {ITEMS.map((item) => (
          <span key={item}><Icon name="check" size={16} stroke={2.4} /> {item}</span>
        ))}
      </div>
    </div>
  );
}
