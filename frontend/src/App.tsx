import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import Hero from './components/Hero';

export default function App() {
  return (
    <div className="relative h-screen w-full">
      <Hero />
      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center">
        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0, rotateY: [0, 5, -5, 0] }}
          transition={{ duration: 2.4, ease: 'easeInOut' }}
          className="text-7xl font-extrabold tracking-wide text-metal drop-shadow"
        >
          Perspectiv
        </motion.h1>

        <motion.p
          className="mt-4 text-sm text-gray-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 1.2 }}
        >
          Beyond Numbers.
        </motion.p>

        <motion.div
          className="pointer-events-auto mt-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 1 }}
        >
          <Link
            to="/upload"
            className="text-sm text-gray-300 border-b border-gray-600 transition hover:border-white hover:text-white"
          >
            Upload CSV &rarr;
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
