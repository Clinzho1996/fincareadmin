import { useEffect, useState } from "react";

const Modal = ({
	title,
	isOpen,
	onClose,
	children,
	className = "", // Allow custom styling
}: {
	title?: string;
	isOpen: boolean;
	onClose: () => void;
	children: React.ReactNode;
	className?: string;
}) => {
	const [isVisible, setIsVisible] = useState(false);

	useEffect(() => {
		if (isOpen) {
			setIsVisible(true);
		} else {
			const timeout = setTimeout(() => setIsVisible(false), 100);
			return () => clearTimeout(timeout);
		}
	}, [isOpen]);

	if (!isVisible) return null;

	return (
		<div
			className={`modal-overlay ${isOpen ? "fade-in" : "fade-out"}`}
			onClick={onClose}>
			<div
				className={`modal-content bg-[#F6F8FA] p-5 border-[1px] border-primary-1 ${
					isOpen ? "slide-in" : "slide-out"
				} ${className}`}
				onClick={(e) => e.stopPropagation()}>
				<div className="flex flex-row bg-white justify-between items-center gap-20 mb-3">
					<div className="flex flex-col gap-2">
						<p className="text-sm text-dark-1 font-medium font-inter">
							{title}
						</p>
					</div>
				</div>
				{children}
			</div>

			<style jsx>{`
				.modal-overlay {
					position: fixed;
					top: 0;
					left: 0;
					width: 100%;
					height: 100%;
					background: rgba(0, 0, 0, 0.5);
					display: flex;
					justify-content: center;
					align-items: center;
					transition: opacity 0.8s ease-in-out;
					z-index: 100;
				}
				.modal-content {
					background: #fff;
					padding: 1rem;
					border-radius: 8px;
					position: relative;
					max-width: 100%;
					transition: transform 0.8s ease-in-out, opacity 0.8s ease-in-out;
				}
				.fade-in {
					opacity: 1;
				}
				.fade-out {
					opacity: 0;
					transition: transform 0.8s ease-in-out, opacity 0.8s ease-in-out;
				}
			`}</style>
		</div>
	);
};

export default Modal;
