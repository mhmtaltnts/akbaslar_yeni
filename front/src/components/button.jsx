import PropTypes from "prop-types";
import clsx from "clsx";

const Button = ({
  children,
  variant = "primary",
  className = "",
  ...props
}) => {
  const baseStyles =
    "p-1 md:p-2 text-sm font-semibold rounded border-2 cursor-pointer transition-all duration-200 shadow-md "; // Increased padding, border, and added shadow

  const variantStyles = {
    primary:
      "text-white bg-blue-500 border-blue-700 hover:bg-blue-600 hover:border-blue-600 drop-shadow-lg",
    danger:
      "text-white bg-kirmizi border-red-800 hover:bg-red-700 hover:border-red-700 drop-shadow-lg",
    success:
      "text-white bg-green-600 border-green-800 hover:bg-green-700 hover:border-green-700 drop-shadow-lg",
    warning:
      "text-gray-900 bg-yellow-400 border-yellow-600 hover:bg-yellow-500 hover:border-yellow-500 drop-shadow-lg",
  };

  return (
    <button
      className={clsx(baseStyles, variantStyles[variant], className)}
      {...props}
    >
      {children}
    </button>
  );
};

Button.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(["primary", "danger", "success", "warning"]),
  className: PropTypes.string,
};

export default Button;
