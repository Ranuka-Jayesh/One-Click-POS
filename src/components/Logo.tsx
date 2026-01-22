export default function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 flex items-center justify-center">
        <img 
          src="/logowhite.png" 
          alt="One Click Logo" 
          className="w-full h-full object-contain"
        />
      </div>
    </div>
  );
}
