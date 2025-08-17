import React from "react";

interface RiskBadgeProps {
  level: "Low" | "Medium" | "High";
  score: number;
  className?: string;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({
  level,
  score,
  className = "",
}) => {
  const getBadgeClass = () => {
    switch (level) {
      case "Low":
        return "risk-badge-low";
      case "Medium":
        return "risk-badge-medium";
      case "High":
        return "risk-badge-high";
      default:
        return "risk-badge-low";
    }
  };

  return (
    <span className={`${getBadgeClass()} ${className}`}>
      {level} Risk ({score}/100)
    </span>
  );
};
