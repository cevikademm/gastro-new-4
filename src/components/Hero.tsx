import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { ArrowRight, Play, Star } from 'lucide-react';
import { Showcase3D } from './Showcase3D';
import { useNavigate } from 'react-router-dom';

export function Hero() {
  const navigate = useNavigate();
  const { scrollY } = useScroll();
  const smoothScroll = useSpring(scrollY, { damping: 30, stiffness: 100, mass: 1 });
  const y1 = useTransform(smoothScroll, [0, 1000], [0, 250]);
  const y2 = useTransform(smoothScroll, [0, 1000], [0, -100]);
  const opacity = useTransform(smoothScroll, [0, 600], [1, 0]);
  
  // High-performance text reveal staggered animation
  const textContainer: any = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
  };
  
  const textItem: any = {
    hidden: { opacity: 0, y: 40, filter: "blur(10px)" },
    show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 1, ease: "easeOut" } }
  };

  return (
    <section className="relative pt-40 pb-20 overflow-hidden min-h-screen flex items-center z-10 w-full perspective-1000">
      <div className="max-w-[90rem] mx-auto px-6 lg:px-12 w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <motion.div
           style={{ y: y1, opacity }}
           className="relative z-20"
        >
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="flex items-center gap-3 mb-10 w-full max-w-full"
          >
             <span className="h-0.5 w-8 sm:w-10 bg-brand-red shadow-[0_0_10px_rgba(232,93,38,0.8)] shrink-0" />
             <span className="text-[11px] sm:text-xs font-bold tracking-[0.2em] sm:tracking-[0.4em] uppercase text-white/70 truncate sm:whitespace-normal">Yeni Nesil Mutfak Mimarisi</span>
          </motion.div>
          
          <motion.div variants={textContainer} initial="hidden" animate="show" className="mb-10 flex flex-col gap-2 relative w-full max-w-full">
            {['PROFESSIONAL', 'KITCHEN', 'EQUIPMENT'].map((word, i) => (
              <motion.h1 
                key={word}
                variants={textItem}
                className={`text-[8vw] min-[380px]:text-3xl min-[500px]:text-4xl leading-[1.1] sm:leading-[0.9] sm:text-6xl md:text-7xl lg:text-[6.5rem] font-display font-bold break-words ${i === 1 ? 'text-transparent text-stroke-red text-stroke' : 'text-white drop-shadow-2xl'}`}
              >
                {word}
              </motion.h1>
            ))}
          </motion.div>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.8 }}
            className="text-white/60 max-w-lg text-lg mb-12 leading-relaxed font-sans font-light"
          >
            Endüstri standartlarını yeniden belirliyoruz. Dünyanın en iyi şefleri için tasarlanmış kusursuz ve ikonik ekipmanlar.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.9 }}
            className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-stretch sm:items-center w-full"
          >
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/diamond')}
              className="bg-brand-red text-white py-4 sm:py-5 px-8 sm:px-12 rounded-full font-bold uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-4 shadow-[0_0_30px_rgba(232,93,38,0.4)] border border-brand-red hover:bg-brand-dark hover:shadow-none transition-all duration-300 w-full sm:w-auto"
            >
              Koleksiyonu İncele <ArrowRight className="w-4 h-4" />
            </motion.button>
            <motion.button 
              whileHover={{ color: "#E85D26" }}
              onClick={() => navigate('/projects')}
              className="text-white/70 py-4 px-6 font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 transition-colors duration-300 w-full sm:w-auto border border-white/5 sm:border-transparent rounded-full sm:rounded-none"
            >
              Projelerimiz
            </motion.button>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1.1 }}
            className="mt-16 sm:mt-20 flex flex-wrap sm:flex-nowrap items-center gap-8 sm:gap-12"
          >
            <div>
              <div className="text-xl sm:text-2xl font-display font-bold text-white mb-1">10.000+</div>
              <div className="text-[8px] sm:text-[9px] font-bold text-brand-red uppercase tracking-widest">Premium Ürün</div>
            </div>
            <div className="w-px h-8 bg-white/10 hidden sm:block" />
            <div>
              <div className="text-xl sm:text-2xl font-display font-bold text-white flex items-center gap-2 mb-1">
                4.9/5 <Star className="w-4 h-4 fill-brand-red text-brand-red drop-shadow-[0_0_8px_rgba(232,93,38,0.8)]" />
              </div>
              <div className="text-[8px] sm:text-[9px] font-bold text-brand-red uppercase tracking-widest">Memnuniyet Oranı</div>
            </div>
          </motion.div>
        </motion.div>

        {/* 3D Showcase Block */}
        <motion.div
           style={{ y: y2 }}
           initial={{ opacity: 0, filter: "blur(20px)" }}
           animate={{ opacity: 1, filter: "blur(0px)" }}
           transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
           className="relative w-full h-[60vh] min-h-[450px] sm:h-[500px] lg:h-[700px] mx-auto mt-10 lg:mt-0"
        >
          {/* Extremely thin, sleek ring around the 3D model */}
          <div className="absolute inset-4 rounded-full border border-white/5 shadow-[inset_0_0_50px_rgba(0,0,0,0.5)] bg-gradient-to-br from-brand-gray/10 to-transparent backdrop-blur-[2px] hidden sm:block" />
          <div className="absolute inset-0 z-10">
            <Showcase3D />
          </div>
          
          <motion.div 
             initial={{ opacity: 0, x: 20 }}
             animate={{ opacity: 1, x: 0 }}
             transition={{ duration: 1, delay: 1.5 }}
             className="absolute bottom-24 right-0 z-20 bg-[#0a0a0a]/90 backdrop-blur-md p-6 rounded-3xl border border-white/10 shadow-2xl max-w-[240px] hidden sm:block pointer-events-none"
          >
            <div className="flex items-center gap-4 mb-4">
               <div className="relative flex items-center justify-center">
                 <div className="absolute inset-0 bg-brand-red/20 rounded-full animate-ping" />
                 <div className="w-8 h-8 rounded-full bg-brand-red flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(232,93,38,0.6)]">
                   <Play className="w-3 h-3 fill-white text-white ml-0.5" />
                 </div>
               </div>
               <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white">Interactive 3D</span>
            </div>
            <p className="text-[10px] leading-relaxed text-white/50 font-sans tracking-wide">Mükemmelliği her açıdan görün. Modele dokunun ve 360 derece inceleyin.</p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
