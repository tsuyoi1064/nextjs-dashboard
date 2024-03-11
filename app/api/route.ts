export async function GET() {
    const url: string = `http://localhost:8080/movies`;

    const res = await fetch(url)
    const data = await res.json()
    return Response.json({ data })
}
