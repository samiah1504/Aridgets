interface Step {
  title: string;
  description: string;
}

export default function HowItWorks({ steps }: { steps?: Step[] }) {
  if (!steps?.length) return null;
  return (
    <section className="px-4 py-10">
      <div className="max-w-lg mx-auto">
        <h2 className="text-2xl font-bold mb-8 text-center">How It Works</h2>
        <div className="space-y-6">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-4">
              <div
                className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg"
                style={{ backgroundColor: "var(--product-primary)" }}
              >
                {i + 1}
              </div>
              <div>
                <h3 className="font-bold text-base mb-1">{step.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
