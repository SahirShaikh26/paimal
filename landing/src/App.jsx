import { Routes, Route } from 'react-router-dom';
import Nav from './components/Nav';
import Footer from './components/Footer';
import Home from './pages/Home';
import Industries from './pages/Industries';

// Router-agnostic app shell. The client entry (main.jsx) wraps this in
// BrowserRouter; the build-time SSG entry (entry-server.jsx) wraps it in
// StaticRouter. Both pages are eager so they fully prerender to static HTML
// (a lazy route would only render its Suspense fallback at build time).
export default function App() {
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <Nav />
      <main id="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/industries" element={<Industries />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}
