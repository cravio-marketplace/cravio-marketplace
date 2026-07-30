/**
 * Card — base surface used across the dashboard.
 */
export default function Card({ children, className = '', as: Tag = 'div', ...rest }) {
    return (
        <Tag
            className={`bg-white rounded-2xl border border-gray-100 shadow-soft ${className}`}
            {...rest}
        >
            {children}
        </Tag>
    );
}
