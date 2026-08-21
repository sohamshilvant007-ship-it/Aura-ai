# Mera Khud Ka AI Chatbot

Ye ek **offline, bina API ke chalne wala chatbot** hai jo aapne khud "banaya" hai.
Isse aap seekh sakte ho ki AI chatbot andar se kaise kaam karta hai.

## Kaise chalayein

1. Apne computer/phone (Pydroid, Termux, ya laptop) mein Python install karo
2. Is folder ko extract karo
3. Terminal mein jaake ye command chalao:

   ```
   python chatbot.py
   ```

4. Bas, chat karna shuru kar do!

## Naya gyaan sikhana (self-learning)

Chat karte waqt aap likh sakte ho:

```
teach: tumhara favourite color kya hai | Mera favourite color blue hai
```

Iske baad bot ye sawal-jawab yaad rakh lega (knowledge.json file mein save hota hai).

## Ye "asli" advanced AI (Claude/ChatGPT) se kaise alag hai?

| Cheez | Ye chatbot | Claude/ChatGPT |
|---|---|---|
| Kaam karne ka tarika | Keyword matching (rules) | Neural network, arbo(billions) parameters |
| Training data | Khud daala hua thoda | Internet ka bahut bada hissa |
| Samajhne ki power | Simple, fixed patterns | Naye/complex sawal bhi samajhta hai |
| Cost | Free, apna computer | Crores rupaye training cost |
| Offline chalega? | Haan | Nahi (server chahiye) |

## Aage kaise advanced banayein (agla step)

1. **NLTK / spaCy** library use karke better language understanding add karo
2. **scikit-learn** se ek chhota "intent classifier" train karo apne data pe
3. Jab Python aur ML ke basics aa jaayein, **PyTorch** se apna chhota neural network train karo
4. Agar bada model chahiye ho aur resources ho, to **Hugging Face** ke open-source
   models (jaise TinyLlama, Phi, Gemma) apne computer pe locally chala sakte ho —
   ye "asli AI" jaisa mehsoos hoga, aur kisi API ki zaroorat nahi

Koi bhi step pe atak jao to bata dena, uska code bhi bana dunga.
