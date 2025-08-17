import React from "react";

export type Theme = "blue" | "purple" | "green" | "pink" | "orange" | "teal";

interface ThemeSelectorProps {
  currentTheme: Theme;
  onThemeChange: (theme: Theme) => void;
}

const themes: { id: Theme; name: string; colors: string; preview: string }[] = [
  {
    id: "blue",
    name: "Ocean Blue",
    colors: "from-blue-50 via-indigo-50 to-blue-100",
    preview: "bg-gradient-to-r from-blue-500 to-indigo-500",
  },
  {
    id: "purple",
    name: "Lavender",
    colors: "from-purple-50 via-violet-50 to-purple-100",
    preview: "bg-gradient-to-r from-purple-500 to-violet-500",
  },
  {
    id: "green",
    name: "Mint Fresh",
    colors: "from-green-50 via-emerald-50 to-green-100",
    preview: "bg-gradient-to-r from-green-500 to-emerald-500",
  },
  {
    id: "pink",
    name: "Rose Garden",
    colors: "from-pink-50 via-rose-50 to-pink-100",
    preview: "bg-gradient-to-r from-pink-500 to-rose-500",
  },
  {
    id: "orange",
    name: "Sunset",
    colors: "from-orange-50 via-amber-50 to-orange-100",
    preview: "bg-gradient-to-r from-orange-500 to-amber-500",
  },
  {
    id: "teal",
    name: "Aqua",
    colors: "from-teal-50 via-cyan-50 to-teal-100",
    preview: "bg-gradient-to-r from-teal-500 to-cyan-500",
  },
];

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  currentTheme,
  onThemeChange,
}) => {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        🎨 Page Theme
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {themes.map((theme) => (
          <div
            key={theme.id}
            className={`cursor-pointer rounded-xl p-4 border-2 transition-all duration-200 ${
              currentTheme === theme.id
                ? "border-blue-500 bg-blue-50/50"
                : "border-gray-200 hover:border-gray-300 bg-white"
            }`}
            onClick={() => onThemeChange(theme.id)}
          >
            <div className="flex flex-col items-center space-y-2">
              <div
                className={`w-12 h-8 rounded-lg ${theme.preview} shadow-sm`}
              ></div>
              <span className="text-sm font-medium text-gray-700">
                {theme.name}
              </span>
              {currentTheme === theme.id && (
                <span className="text-xs text-blue-600">✓ Active</span>
              )}
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-3">
        Choose a light theme that matches your preference
      </p>
    </div>
  );
};

export const getThemeClasses = (theme: Theme): string => {
  const themeMap = {
    blue: "bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100",
    purple: "bg-gradient-to-br from-purple-50 via-violet-50 to-purple-100",
    green: "bg-gradient-to-br from-green-50 via-emerald-50 to-green-100",
    pink: "bg-gradient-to-br from-pink-50 via-rose-50 to-pink-100",
    orange: "bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100",
    teal: "bg-gradient-to-br from-teal-50 via-cyan-50 to-teal-100",
  };
  return themeMap[theme];
};

export const getThemeGradientClass = (theme: Theme): string => {
  return `gradient-text-${theme}`;
};
