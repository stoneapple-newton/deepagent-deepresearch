# Karpathy-Style LLM Wiki

A from-scratch mental model of how large language models work, inspired by Andrej Karpathy's teaching style.

---

## 1. Tokenization: text → integers

A language model does not read characters directly. It reads **tokens**.

- A **tokenizer** splits raw text into a fixed vocabulary of integer IDs.
- Modern LLMs use sub-word tokenization (BPE / SentencePiece):
  - Common words get their own token.
  - Rare words are split into smaller pieces.
  - This keeps vocabulary size manageable (tens of thousands) while handling any word.
- Consequence: the model reasons over tokens, not words. Pricing, context length, and speed are all measured in tokens.

### Mental model

```
"hello world"  ->  [15496, 995]
```

A tokenizer is a deterministic compression scheme: text in, list of integers out.

---

## 2. The Transformer: one block, repeated many times

The transformer is a stack of identical layers. Each layer has two main pieces.

### 2.1 Self-attention

For every token, the model asks:

> "Which previous tokens should I pay attention to right now?"

It does this using three learned vectors for each token:

- **Query (Q):** what am I looking for?
- **Key (K):** what do I contain?
- **Value (V):** if I am relevant, what information do I pass on?

Steps:

1. Compute dot products between every query and every key.
2. Scale and apply a causal mask so a token can only attend to itself and earlier tokens.
3. Run through softmax to get attention weights.
4. Sum the value vectors weighted by those scores.

This is the famous scaled dot-product attention:

```
Attention(Q, K, V) = softmax(QK^T / sqrt(d_k)) V
```

Multi-head attention runs many of these attention operations in parallel, each learning a different kind of relationship.

### 2.2 Feed-forward network (MLP)

After attention, each token vector passes through a simple two-layer MLP. This is where memorized facts and non-linear transformations live.

### 2.3 LayerNorm, residuals, and the stack

Each sub-layer is wrapped in:

- **Residual connection:** `x + sublayer(x)`
- **Layer normalization:** keeps activations stable

Stack 12, 24, 96, or more of these blocks and you have a transformer.

---

## 3. GPT: autoregressive next-token prediction

GPT-style models are **causal / autoregressive** language models.

- Training objective: given a sequence of tokens, predict the next token.
- Loss: cross-entropy over the vocabulary at every position.
- The final hidden state for each token is projected to vocabulary size; softmax gives a probability distribution over the next token.

### Training loop

```
for batch in data:
    logits = model(batch.tokens)
    loss = cross_entropy(logits, batch.next_tokens)
    loss.backward()
    optimizer.step()
```

That is almost the entire pre-training recipe. The magic is in the data and scale.

---

## 4. Training at scale

Pre-training has three ingredients:

1. **Data:** huge amounts of mostly public internet text.
2. **Compute:** many GPUs / TPUs for weeks or months.
3. **Parameters:** billions of weights updated by gradient descent.

Key ideas:

- **Next-token prediction** forces the model to learn syntax, facts, reasoning, and world models — because compressing text well requires understanding it.
- **Scaling laws:** loss predictably improves with more data, parameters, and compute.
- **Emergence:** at sufficient scale, abilities like in-context learning and chain-of-thought appear without being explicitly trained.

---

## 5. Alignment: from pre-trained model to helpful assistant

A pre-trained model predicts internet text. An assistant follows instructions. Closing that gap is **alignment**.

### 5.1 Supervised fine-tuning (SFT)

Train the model on high-quality (instruction, response) pairs written by humans.

### 5.2 Reward modeling

Humans rank several model responses. A smaller model is trained to predict those preferences:

```
RewardModel(prompt, response) -> scalar human-preference score
```

### 5.3 Reinforcement learning from human feedback (RLHF)

Use the reward model to fine-tune the policy with PPO:

1. Generate a response.
2. Score it with the reward model.
3. Update the policy to produce higher-scoring responses.
4. Add a KL penalty so the model does not drift too far from the SFT model.

### 5.4 DPO and friends

Direct Preference Optimization (DPO) skips the separate reward model and optimizes directly from preference pairs. It is simpler and often just as effective.

---

## 6. Inference tricks

Once trained, generating text efficiently matters.

### 6.1 KV cache

During autoregressive generation, the keys and values for past tokens do not change. The **KV cache** stores them, so each new token only computes attention for itself against the cached past. This turns generation from quadratic into roughly linear work per step.

### 6.2 Sampling strategies

A language model outputs a probability distribution over the vocabulary. How you sample from it changes the personality of the output:

- **Greedy:** always pick the highest-probability token. Deterministic but often repetitive.
- **Temperature:** divide logits by `T`. Low `T` makes the model more focused; high `T` makes it more random.
- **Top-k:** sample only from the `k` most likely tokens.
- **Top-p (nucleus):** sample from the smallest set of tokens whose cumulative probability exceeds `p`.

### 6.3 Quantization

Store weights in lower precision (INT8, INT4, FP16) to reduce memory and speed up inference. This trades a small amount of quality for large gains in efficiency.

---

## Summary

```
Text  --tokenize-->  Tokens  --embed-->  Vectors
                                  |
                    +-----------------------------+
                    |  Transformer block × N      |
                    |  - masked self-attention    |
                    |  - MLP                      |
                    |  - residual + layer norm    |
                    +-----------------------------+
                                  |
                           next-token logits
                                  |
                        sample / decode
                                  |
                              output text
```

A language model is, at its core, a token-level next-token predictor built out of attention and feed-forward layers, trained on internet-scale text, and aligned to be helpful.
