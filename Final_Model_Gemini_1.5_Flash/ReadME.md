# AI-Powered Story Generation and Narration System (Gemini 1.5 Flash API - Trail2)

This project demonstrates the use of Google Gemini 1.5 Flash API for generating and evaluating children's stories.

## Project Structure

```
Gemini_1.5Flash_api_model/
    Trail2_api_model.ipynb
    config.py
    requirements.txt
```

## Features

- Generate creative, age-appropriate stories for children using Google Gemini 1.5 Flash API ([Trail2_api_model.ipynb](Trail2_api_model.ipynb))
- Evaluate stories for readability using Flesch Reading Ease and other metrics
- Batch generation and evaluation for multiple input combinations
- Calculate Flesch Reading Score error and RMSE for generated stories

## Requirements

- Python 3.10+
- Jupyter Notebook
- google-generativeai==0.5.4
- textstat==0.7.3
- pandas==2.2.2
- numpy==1.26.4

## Setup

1. **Clone the repository** and navigate to the project directory.

2. **Install dependencies**  
   Run the following in your notebook or terminal:
   ```python
   !pip install -r requirements.txt
   ```

3. **Google Gemini API Key Setup**  
   - Create a file named `config.py` in the same folder as the notebook.
   - Add your API key in `config.py` as follows:
     ```python
     API_KEY = "your_actual_gemini_api_key_here"
     ```
   - **Important:** Do not share or commit `config.py` to version control.

## Usage

Open `Trail2_api_model.ipynb` and run the cells to:

- Generate stories with the Gemini API
- Evaluate readability and other metrics (Flesch Reading Ease, Grade Level, Word Count, etc.)
- Batch process multiple story prompts and view results in a DataFrame
- View Flesch Reading Score error and RMSE for model evaluation

## Readability Metrics

The Flesch Reading Ease (FRE) score is used to assess how easy a story is to read. The table below shows the mapping used in this project for Indian education levels and age groups:

| **Age Range** | **Label**         | **Target Flesch Score** | **Reading Difficulty** |
|---------------|-------------------|-------------------------|------------------------|
| **3–8**       | Early Readers     | **80–100**              | Very Easy              |
| **9–15**      | Pre-teens/Teens   | **60–80**               | Easy to Fairly Easy    |
| **16–19**     | Older Teens       | **50–60**               | Fairly Difficult       |
| **20+**       | Adults            | **30–50**               | Difficult              |

[Reference: IJCRT2006314.pdf](https://ijcrt.org/papers/IJCRT2006314.pdf)

## Notes

- API keys should be kept secret. Do not share your API key publicly or commit `config.py`.
- The notebook demonstrates both single and batch story generation and evaluation.
- RMSE of Flesch Error is calculated to evaluate how closely generated stories match the target readability for each age group.




