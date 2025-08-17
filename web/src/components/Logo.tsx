import React from "react";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = "md", className = "" }) => {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
    xl: "w-24 h-24",
  };

  return (
    <div className={`${sizeClasses[size]} ${className}`}>
      <svg
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Shield Background */}
        <path
          d="M100 20C100 20 160 35 160 35C160 35 160 85 160 100C160 130 130 160 100 180C70 160 40 130 40 100C40 85 40 35 40 35C40 35 100 20 100 20Z"
          fill="#1e3a5f"
          stroke="#2d5a87"
          strokeWidth="3"
        />

        {/* Inner Shield */}
        <path
          d="M100 35C100 35 145 45 145 45C145 45 145 85 145 95C145 115 125 135 100 150C75 135 55 115 55 95C55 85 55 45 55 45C55 45 100 35 100 35Z"
          fill="#f8fafc"
          stroke="#1e3a5f"
          strokeWidth="2"
        />

        {/* Code Bubble */}
        <rect x="70" y="60" width="60" height="35" rx="8" fill="#1e3a5f" />

        {/* Code Symbols */}
        <path
          d="M80 70L85 75L80 80M90 80L85 75L90 70M95 82L105 68"
          stroke="#ffffff"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </div>
  );
};

export const LogoWithText: React.FC<{
  size?: "sm" | "md" | "lg";
  theme?: string;
}> = ({ size = "md", theme = "blue" }) => {
  const containerClasses = {
    sm: "flex items-center space-x-2",
    md: "flex items-center space-x-3",
    lg: "flex items-center space-x-4",
  };

  const textClasses = {
    sm: "text-lg font-bold",
    md: "text-xl font-bold",
    lg: "text-2xl font-bold",
  };

  const taglineClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  return (
    <div className={containerClasses[size]}>
      <Logo size={size} />
      <div>
        <h1 className={`${textClasses[size]} gradient-text-${theme}`}>
          PR MANAGER
        </h1>
        <p
          className={`${taglineClasses[size]} text-gray-600 -mt-1 font-medium`}
        >
          CODE REVIEW
        </p>
        <p className="text-xs text-gray-500 -mt-1">
          From diff to decision – instantly
        </p>
      </div>
    </div>
  );
};
