<div align="center">

# <img src="assets/logo.svg" alt="Tencent Youtu Lab Logo" height="26px"> Youtu-LLM: <br>解锁轻量级大语言模型的原生智能体潜力

[🔖 English](README.md) • [🤗 模型](https://huggingface.co/collections/tencent/youtu) • [📑 技术报告](assets/Youtu-LLM_Technical_Report.pdf) • [⭐ 贡献与创新](#contributions) • [📊 性能对比](#benchmarks) • [🚀 快速入门](#quickstart)

</div>

## 🎯 简介

**Youtu-LLM**是一款全新、小巧但强大的LLM，仅包含1.96B参数，支持128K上下文，并具备原生智能体能力。在通用评估中，Youtu-LLM在常识、STEM、代码和长文能力上显著优于同等规模的现有LLM；在智能体相关测试中，Youtu-LLM超越了规模更大的领先者，并真正能够完成多个端到端的智能体任务。

**Youtu-LLM**具有以下特性：
- 类型: 基于密集[MLA](https://arxiv.org/abs/2405.04434)的自回归LLM
- 发布版本: [Base](https://huggingface.co/tencent/Youtu-LLM-2B-Base)和[Instruct](https://huggingface.co/tencent/Youtu-LLM-2B)
- 总参数量: 1.96B
- 层数: 32
- 注意力头数（MLA）: 16 for Q/K/V
- MLA Rank: 1536 for Q, 512 for K/V 
- MLA维度: 128 for QK Nope, 64 for QK Rope, and 128 for V
- 支持文本长度: 131072
- 词表大小: 128256

<a id="contributions"></a>

## 🚀 贡献与创新

Youtu-LLM的主要贡献如下:
- 🎯 **以STEM能力为出发点的设计**：Youtu-LLM的设计以STEM能力和智能体能力为出发点，涉及词表构建、数据配比和多阶段课程学习策略。
- 💡 **原生智能体能力**：Youtu-LLM使用128K上下文进行原生训练，并辅以智能体中期训练（Agentic Mid-training），从而能够在端侧场景中实现更多轮次的交互。
- ⚡ **SOTA 性能**：Youtu-LLM基于dense MLA架构，在轻量级LLM上实现了SOTA性能，超越了传统的dense GQA/MHA范式。MLA 架构也意味着Youtu-LLM可以轻松集成到现有的面向DSV3的生态系统中。

<a id="benchmarks"></a>

## 📊 性能对比

### 基础模型
#### 通用基准测试
| Type | Benchmark (Metric) | # Shots | Qwen3-1.7B-Base | SmoLM3-3B-Base | Gemma3-4B-Base | Qwen3-4B-Base | Llama3.1-8B | Youtu-LLM-2B-Base |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| Commonsense  | MMLU-Pro (EM) | 5 | 34.9% | 35.3% | 29.4% | <u>46.1%</u> | 36.2% | **48.4%** |
|              | MLQA-Zh (EM) | 3 | 38.1% | 38.0% | 40.3% | **47.2%** | 43.0% | <u>43.5%</u> |
|              | MMLU-ProX-Zh (EM) | 5 | 32.5% | 26.7% | 24.2% | **45.2%** | 25.4% | <u>40.7%</u> |
| STEM         | GSM8K (EM) | 8 | 68.2% | 67.3% | 38.5% | **80.8%** | 47.8% | <u>77.6%</u> |
|              | MGSM-Zh (EM) | 8 | 57.1% | 40.7% | 33.0% | **69.7%** | 35.9% | <u>68.9%</u> |
|              | MATH (EM) | 4 | 28.1% | 40.8% | 24.4% | **44.8%** | 21.5% | <u>44.4%</u> |
|              | BBH (EM) | 3 | 53.0% | 59.8% | 51.6% | **70.8%** | <u>62.9%</u> | 59.8% |
|              | GPQA-MC (Acc. Norm) | 5 | 30.4% | 26.6% | 28.6% | **37.8%** | 30.1% | <u>33.3%</u> |
|              | HLE-MC (Acc. Norm) | 3 | 10.7% | 3.1% | 8.0% | <u>15.0%</u> | 11.5% | **17.4%** |
| Coding       | MBPP (Pass@1) | 3 | 55.6% | 51.0% | 45.8% | **67.5%** | 49.4% | <u>66.6%</u> |
|              | MBPP+ (Pass@1) | 3 | 71.0% | 66.1% | 61.9% | <u>80.8%</u> | 62.7% | **81.8%** |
|              | HumanEval (Pass@1) | 0 | 49.9% | 34.8% | 36.6% | <u>57.6%</u> | 36.0% | **64.6%** |
|              | HumanEval+ (Pass@1) | 0 | 41.3% | 28.1% | 28.1% | <u>49.9%</u> | 28.1% | **57.3%** |
|              | LiveCodeBench v6 (Pass@1) | 3 | 5.1% | 2.9% | 2.9% | <u>6.9%</u> | 3.4% | **9.7%** |
|              | CRUXEval (Pass@1) | 1 | 40.6% | 42.1% | 39.7% | <u>54.8%</u> | 42.3% | **55.9%** |
|              | RepoBench (EM) | 3 | 21.0% | 21.8% | 23.0% | **25.3%** | <u>25.2%</u> | 22.7% |
| Long Context | LongBench v2 (Acc.) | 3 | <u>28.0%</u> | **28.8%** | 26.6% | 25.8% | 27.8% | 27.2% |
|              | NIAH (Acc.) | / | 79.8% | 75.0% | <u>99.5%</u> | 83.0% | **99.8%** | 98.8% |

#### 智能体基准测试
我们使用[APTBench](https://github.com/TencentYoutuResearch/APTBench/)来评估基础模型的智能体能力。

| Category | Qwen3-1.7B-Base | SmoLM3-3B-Base | Gemma3-4B-Base | Qwen3-4B-Base | Llama3.1-8B | Youtu-LLM-2B-Base |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| Code | 25.1% | 24.3% | 32.8% | **41.9%** | 23.6% | <u>37.9%</u> |
| Deep Research | 28.5% | 27.2% | 36.4% | **40.5%** | 30.0% | <u>38.6%</u> |
| Math | 59.9% | 60.7% | 59.8% | **70.5%** | 60.1% | <u>68.0%</u> |
| Tool | 56.7% | 59.1% | 61.7% | **65.8%** | 64.1% | <u>64.2%</u> |

### 指令模型
#### 通用基准测试
| Type | Benchmark (Metric) | # Shots | Qwen3-1.7B-Base | SmoLM3-3B-Base | Gemma3-4B-Base | Qwen3-4B-Base | Llama3.1-8B | Youtu-LLM-2B-Base |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| Commonsense  | MMLU-Pro (EM) | 5 | 34.9% | 35.3% | 29.4% | <u>46.1%</u> | 36.2% | **48.4%** |
|              | MLQA-Zh (EM) | 3 | 38.1% | 38.0% | 40.3% | **47.2%** | 43.0% | <u>43.5%</u> |
|              | MMLU-ProX-Zh (EM) | 5 | 32.5% | 26.7% | 24.2% | **45.2%** | 25.4% | <u>40.7%</u> |
| STEM         | GSM8K (EM) | 8 | 68.2% | 67.3% | 38.5% | **80.8%** | 47.8% | <u>77.6%</u> |
|              | MGSM-Zh (EM) | 8 | 57.1% | 40.7% | 33.0% | **69.7%** | 35.9% | <u>68.9%</u> |
|              | MATH (EM) | 4 | 28.1% | 40.8% | 24.4% | **44.8%** | 21.5% | <u>44.4%</u> |
|              | BBH (EM) | 3 | 53.0% | 59.8% | 51.6% | **70.8%** | <u>62.9%</u> | 59.8% |
|              | GPQA-MC (Acc. Norm) | 5 | 30.4% | 26.6% | 28.6% | **37.8%** | 30.1% | <u>33.3%</u> |
|              | HLE-MC (Acc. Norm) | 3 | 10.7% | 3.1% | 8.0% | <u>15.0%</u> | 11.5% | **17.4%** |
| Coding       | MBPP (Pass@1) | 3 | 55.6% | 51.0% | 45.8% | **67.5%** | 49.4% | <u>66.6%</u> |
|              | MBPP+ (Pass@1) | 3 | 71.0% | 66.1% | 61.9% | <u>80.8%</u> | 62.7% | **81.8%** |
|              | HumanEval (Pass@1) | 0 | 49.9% | 34.8% | 36.6% | <u>57.6%</u> | 36.0% | **64.6%** |
|              | HumanEval+ (Pass@1) | 0 | 41.3% | 28.1% | 28.1% | <u>49.9%</u> | 28.1% | **57.3%** |
|              | LiveCodeBench v6 (Pass@1) | 3 | 5.1% | 2.9% | 2.9% | <u>6.9%</u> | 3.4% | **9.7%** |
|              | CRUXEval (Pass@1) | 1 | 40.6% | 42.1% | 39.7% | <u>54.8%</u> | 42.3% | **55.9%** |
|              | RepoBench (EM) | 3 | 21.0% | 21.8% | 23.0% | **25.3%** | <u>25.2%</u> | 22.7% |
| Long Context | LongBench v2 (Acc.) | 3 | <u>28.0%</u> | **28.8%** | 26.6% | 25.8% | 27.8% | 27.2% |
|              | NIAH (Acc.) | / | 79.8% | 75.0% | <u>99.5%</u> | 83.0% | **99.8%** | 98.8% |

#### 智能体基准测试
| Benchmark | Qwen3-1.7B | SmolLM3-3B | Qwen3-4B | Youtu-LLM-2B |
| :--- | :---: | :---: | :---: | :---: |
| **Deep Research** | | | | |
| GAIA | 11.4% | 11.7% | <u>25.5%</u> | **33.9%** |
| xbench | 11.7% | 13.9% | <u>18.4%</u> | **19.5%** |
| **Code** | | | | |
| SWE-Bench-Verified | 0.6% | <u>7.2%</u> | 5.7% | **17.7%** |
| EnConda-Bench | 10.8% | 3.5% | <u>16.1%</u> | **21.5%** |
| **Tool** | | | | |
| BFCL V3 | 55.5% | 31.5% | **61.7%** | <u>58.0%</u> |
| τ²-Bench | 2.6% | 9.7% | <u>10.9%</u> | **15.0%** |

## 📁 评估复现

我们提供了用于复现上述分数的评估代码。
- 对于[Youtu-LLM-2B-Base](https://huggingface.co/tencent/Youtu-LLM-2B-Base)，所有短文通用基准测试可使用[base_eval](base_eval/)进行评估，智能体指标可使用[APTBench](https://github.com/TencentYoutuResearch/APTBench/)获取。
- 对于[Youtu-LLM-2B](https://huggingface.co/tencent/Youtu-LLM-2B)，所有通用基准测试可使用[instruct_eval](instruct_eval/)进行评估。

<a id="quickstart"></a>

## 🚀 快速入门

本指南将帮助您快速部署并调用 **Youtu-LLM-2B** 模型。该模型支持“思考模式”（Reasoning Mode），能够通过思维链（CoT）生成更高质量的回答。

### 1. 环境准备

确保您的 Python 环境已安装 `transformers` 库，且版本符合要求。

```bash
pip install "transformers>=4.56" torch accelerate

```

---

### 2. 核心代码示例

以下示例展示了如何加载模型、启用思考模式，并利用 `re` 模块解析输出中的“思考过程”与“最终结论”。

```python
import re
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM

# 1. 配置模型
model_id = "tencent/Youtu-LLM-2B"

# 2. 初始化 Tokenizer 和模型
tokenizer = AutoTokenizer.from_pretrained(model_id, trust_remote_code=True)
model = AutoModelForCausalLM.from_pretrained(
    model_id,
    device_map="auto",
    trust_remote_code=True
)

# 3. 构建对话输入
prompt = "您好"
messages = [{"role": "user", "content": prompt}]

# 使用 apply_chat_template 构造输入，enable_thinking=True 开启思考模式
input_ids = tokenizer.apply_chat_template(
    messages, 
    tokenize=True, 
    add_generation_prompt=True, 
    return_tensors="pt",
    enable_thinking=True
).to(model.device)

# 4. 生成回复
outputs = model.generate(
    input_ids,
    max_new_tokens=512,
    do_sample=True,
    temperature=1.0,
    top_p=0.95,
    repetition_penalty=1.05
)

# 5. 解析结果
full_response = tokenizer.decode(outputs[0], skip_special_tokens=True)

def parse_reasoning(text):
    """提取 <think> 标签内的思考过程与之后的回答内容"""
    thought_pattern = r"<think>(.*?)</think>"
    match = re.search(thought_pattern, text, re.DOTALL)
    
    if match:
        thought = match.group(1).strip()
        answer = text.split("</think>")[-1].strip()
    else:
        thought = "（未产生显式思考过程）"
        answer = text
    return thought, answer

thought, final_answer = parse_reasoning(full_response)

print(f"\n{'='*20} 思考过程 {'='*20}\n{thought}")
print(f"\n{'='*20} 最终回答 {'='*20}\n{final_answer}")

```

---

### 3. 关键配置说明

#### 思考模式开关

在 `apply_chat_template` 方法中，通过 `enable_thinking` 参数控制：

* **True (默认建议)**：激活思维链，适合复杂逻辑推理。
* **False**：直接输出结果，响应速度更快，适合简单对话。

#### 推荐解码参数

根据使用场景，建议调整以下超参数以获得最佳生成效果：

| 参数 | 思考模式 (Reasoning) | 非思考模式 (Normal) |
| --- | --- | --- |
| `do_sample` | `True` | `True` |
| `temperature` | **1.0** (保持创造力) | **0.7** (结果更稳定) |
| `top_p` | 0.95 | 0.8 |
| `top_k` | 20 | 20 |
| `repetition_penalty` | 1.05 | - |

> **提示**：在使用思考模式时，较高的 `temperature` 有助于模型进行更深层的发散性思考。

---

### 4. vLLM 部署

我们提供使用 **vLLM 0.10.2** 部署模型服务的方法。推荐使用的 Docker 镜像为 `vllm/vllm-openai:v0.10.2`。

#### 集成步骤
首先，执行以下命令将Youtu-LLM模型文件集成到 vLLM 框架中。
*注意：请先解压我们提供的经过调整的[vllm压缩文件](vllm_deploy/modified_vllm.zip)，接着将 `<local_modified_vllm_path>` 替换为刚刚解压的vllm代码路径，将 `<vllm_path>` 替换为 vLLM 的安装路径。*

```bash
cp <local_modified_vllm_path>/0_10_2_official/youtu_llm.py <vllm_path>/vllm/model_executor/models/youtu_llm.py
cp <local_modified_vllm_path>/0_10_2_official/configuration_youtu.py <vllm_path>/vllm/model_executor/models/configuration_youtu.py
cp <local_modified_vllm_path>/0_10_2_official/__init__.py <vllm_path>/vllm/config/__init__.py
cp <local_modified_vllm_path>/0_10_2_official/registry.py <vllm_path>/vllm/model_executor/models/registry.py
```

#### 启动服务
集成完成后，即可使用 vLLM 部署模型，启动命令如下：

```bash
vllm serve <model_path> --trust-remote-code
```

**工具调用 (Tool Call) 支持：**
如果要使用 tool_call 能力，请在启动命令中增加以下参数：

```bash
--enable-auto-tool-choice --tool-call-parser hermes
```
