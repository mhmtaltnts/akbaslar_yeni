use serde::Serialize;

// Node tarafındaki controller'ların çoğu `res.json({ message: '...' })`
// döndürüyordu -- aynı küçük şekli her handler'da ayrı struct yazmak yerine
// bir kere burada tanımlayıp paylaşıyoruz. Ders 9-11'de de aynısını
// kullanacağız.
#[derive(Serialize)]
pub struct MessageBody {
    pub message: String,
}

impl MessageBody {
    pub fn new(message: impl Into<String>) -> Self {
        Self {
            message: message.into(),
        }
    }
}

// deleteUser/deleteNote gibi `{ reply: '...' }` şeklinde yanıt veren
// handler'lar için (Node tarafında bu iki endpoint özellikle `reply`
// anahtarını kullanıyordu, `message` değil).
#[derive(Serialize)]
pub struct ReplyBody {
    pub reply: String,
}

impl ReplyBody {
    pub fn new(reply: impl Into<String>) -> Self {
        Self { reply: reply.into() }
    }
}
