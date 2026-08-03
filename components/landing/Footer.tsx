export function Footer() {
  return (
    <footer className="border-t border-neutral-200 bg-white px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 sm:grid-cols-3">
          <div>
            <p className="font-playfair text-lg font-bold text-black">CookConnect</p>
            <p className="font-nunito mt-2 text-sm text-black/50">
              Fresh, custom meal plans delivered to your door.
            </p>
          </div>
          <div>
            <p className="font-nunito text-sm font-semibold text-black">Quick Links</p>
            <div className="font-nunito mt-3 space-y-2 text-sm text-black/50">
              <a href="#meals" className="block transition-colors hover:text-black">Menu</a>
              <a href="#subscription" className="block transition-colors hover:text-black">Pricing</a>
              <a href="#about" className="block transition-colors hover:text-black">About</a>
              <a href="#contact" className="block transition-colors hover:text-black">Contact</a>
            </div>
          </div>
          <div>
            <p className="font-nunito text-sm font-semibold text-black">Contact</p>
            <div className="font-nunito mt-3 space-y-2 text-sm text-black/50">
              <p>cookconnectrestaurant@gmail.com</p>
              <p>+971556634050</p>
              <p>Dubai, UAE</p>
            </div>
          </div>
        </div>
        <div className="font-nunito mt-10 border-t border-neutral-200 pt-6 text-center text-xs text-black/40">
          <p>&copy; {new Date().getFullYear()} CookConnect. All rights reserved.</p>
          <p className="mt-2 font-semibold text-black/80">
            Love what you see?{" "}
            <a
              href="https://www.boonbrigoli.site/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline-offset-2 hover:text-black hover:underline"
            >
              Contact the developer
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
