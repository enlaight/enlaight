import { EnlaightBot } from "@/assets/svgs";

export default function LoadingAnimation(props) {
	const { icon, text } = props;
	return (
		<div className="w-[250px] h-[250px] relative flex flex-col justify-center items-center">
			<div className="absolute w-full h-full text-[#fac114] flex flex-col justify-center items-center animate-bounce-custom">
				{!icon && (
					<EnlaightBot size={100} fill="#fac114" />
				)}
				{icon}
				{text && (
					<div className="flex mt-5 justify-center items-center">
						<p className="max-w-[200px] font-[500] text-center text-muted-foreground line-clamp-2">{text}</p>
					</div>
				)}
			</div>
			<div className="relative w-[350px] h-[350px] flex justify-center align-center animate-bounce-custom">
				{["225", "240", "255", "270", "285", "300", "315"].map((pos, i) => {
					return (
						<div
							key={i}
							className="absolute w-4 h-4 bg-yellow-400 rounded-full mt-[-5px] ml-[-5px] animate-dot-spin"
							style={{
								left: "50%",
								top: "50%",
								'--initial-rotation': `${pos}deg`,
								animationDelay: `${i * -0.05}s`,
							}}
						>
						</div>
					)
				})}
			</div>
		</div>
	)
}
