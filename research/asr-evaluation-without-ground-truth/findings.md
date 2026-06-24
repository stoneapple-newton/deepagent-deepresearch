# Findings: Evaluating ASR Transcripts Without Ground Truth

## 1. Core Methods for Reference-Free ASR Evaluation

### 1.1 Internal Confidence-Based (Glass-Box)
- Use ASR system's own posterior probabilities, attention weights, decoder outputs
- Cheap and fast, but poorly calibrated and cannot detect deletions
- Whisper log-prob averaging as baseline: Pearson 0.56-0.69 vs. 0.89 for learned estimators (Fe-WER, ICASSP 2025)
- Source: https://eprints.whiterose.ac.uk/id/eprint/229408/1/Fe-WER_submitted.pdf

### 1.2 Text-Only / LM Perplexity
- LM perplexity on hypothesis text as quality proxy
- NoRefER (Yuksel et al., 2023): fine-tuned multilingual LM with contrastive learning; Pearson 0.56, Spearman 0.48
- Raw XLM-RoBERTa perplexity near-zero correlation with WER (Pearson 0.02)
- Limitation: ignores speech signal entirely
- Source: https://arxiv.org/html/2306.12577

### 1.3 WER/CER Prediction via Regression
- Most mature approach; train regressor on speech+text features
- e-WER family: Ali & Renals (2018→2020→2023); Pearson up to 0.8 (glass-box), 0.66 (no-box)
- Fe-WER (ICASSP 2025): HuBERT+XLM-R features, MLP; 0.89 PCC, 0.092 RMSE; 3.4× faster
- Waheed et al. (ACL 2025): SONAR multimodal embeddings, proxy ASR references; ~50% MAE reduction; tested 40+ models × 14 datasets
- Source: https://arxiv.org/html/2502.12408v1

### 1.4 TTS-Based Acoustic Discrepancy (READ, June 2026)
- CosyVoice2 TTS model computes conditional likelihood of speech tokens given hypothesis
- Training-free, model-agnostic, provides frame-level error localization
- Up to ~20% relative WER reduction via N-best rescoring
- Key limitation: more effective for acoustic errors than language errors
- Source: https://arxiv.org/html/2606.04680v1

## 2. Existing Tools & Libraries

### WER/CER Computation
- **JiWER** (jitsi/jiwer): Python standard, C++ backend via RapidFuzz, v4.0 (Oct 2025). https://github.com/jitsi/jiwer
- **HuggingFace evaluate**: WER/CER wrapping JiWER. https://huggingface.co/metrics
- **werpy**: Ultra-fast lightweight alternative. https://github.com/analyticsinmotion/werpy
- **NIST SCTK/sclite**: Gold standard C implementation. https://github.com/usnistgov/SCTK
- **TorchMetrics WordErrorRate**: PyTorch-native, GPU-accelerated
- **OpenWER** (2026): Cross-lingual fairness, compound-word detection, 52 languages. https://arxiv.org/html/2606.21237v1

### ASR Frameworks (with built-in evaluation)
- **ESPnet**: Recipe-based eval using NIST SCTK. https://github.com/espnet/espnet
- **NVIDIA NeMo**: speech_to_text_eval.py + Speech Data Explorer visualization. https://github.com/NVIDIA/NeMo
- **SpeechBrain**: ErrorRateStats class + dPOSER, SemDist alternatives. https://github.com/speechbrain/speechbrain
- **Kaldi**: Classic toolkit, SCTK-based. https://github.com/kaldi-asr/kaldi
- **FunASR**: Alibaba DAMO, 50+ languages. https://github.com/modelscope/FunASR

### Reference-Free Specific
- **e-WER / e-WER2** (QCRI): Predict WER per sentence without reference. https://github.com/qcri/e-wer
- **NoRefER**: Self/semi-supervised WER ranking. https://github.com/aixplain/NoRefER
- **Sarvam LLM-WER**: LLM-rescored WER for Indic languages. https://github.com/sarvamai/llm_wer

## 3. LLM-Based Evaluation Approaches

- **Semantic Embedding Distance**: LLM embeds hypothesis and reference, cosine distance (Liu et al., Interspeech 2024)
- **Answer Error Rate (AER)**: QA probing — LLM generates questions from reference, answers from hypothesis; 10-30pp higher than WER (Pulikodan et al., Interspeech 2025)
- **Categorical Severity Scoring**: Tiered classification (EXACT→CRITICAL_ERROR) + error-type labels; better calibrated than raw numeric scores
- **LLM-WER/LLM-CER** (Sarvam AI): LLM judge determines if edit-distance "error" is semantically valid alternative; + Intent Score, Entity Preservation Score
- **Semantic WER** (Pipecat/AssemblyAI): Count only errors that change downstream LLM understanding
- **TRACE** (Chandra et al., EACL 2026): Audio cues → structured blueprint → text-only LLM judge; higher agreement with humans than ALM judges, ~3× cheaper
- **LLM Error Correction as Evaluation**: Post-correction WER change as quality signal; works best when input WER > 10%
- Key concern: LLM calibration poor for numeric scores; use categorical labels and convert offline

## 4. Open Questions & Gaps
- No single method dominates all scenarios
- Distinguishing error types (sub/del/ins) remains open
- High-WER regimes (>70%) poorly handled
- READ (June 2026) not yet independently replicated
- LLM bias against non-mainstream dialects
- Most reference-free methods still need SOME labeled data for training (except READ, perplexity baselines)
