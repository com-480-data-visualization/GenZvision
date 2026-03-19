# Project of Data Visualization (COM-480)

| Student's name | SCIPER |
| -------------- | ------ |
|Rania Boubrik | 361496|
|Maryam Harakat | 359826|
|Rosa Mayila | 275047|
|Valentin Planes | 409205|

[Milestone 1](#milestone-1) • [Milestone 2](#milestone-2) • [Milestone 3](#milestone-3)

## Milestone 1 (20th March, 5pm)

**10% of the final grade**

This is a preliminary milestone to let you set up goals for your final project and assess the feasibility of your ideas.
Please, fill the following sections about your project.

*(max. 2000 characters per section)*

### Dataset
For our project, we chose the **GenZ Slang Evolution Tracker (2020–2025)** dataset from Kaggle (https://www.kaggle.com/datasets/likithagedipudi/genz-slang-evolution-tracker-2020-2025). This dataset follows “GenZ” slang terms across social media and includes information that can help us understand not only which words are popular, but also how they move through online culture over time.

The dataset is based on a topic that people immediately understand. Instead of working with something too technical or abstract. Therefore, it  worked perfectly for us as we wanted a dataset that could lead to a visual story people would actually want to look at, instead of something too technical or abstract. 

The dataset feels like a good match for a data visualization project as it is organized and vast enough to show interesting patterns. It contains a number of rows and columns to explore. The variables include the slang term itself, timestamp, term category, meaning, origin platform, usage platform, region, user age group, usage context, lifecycle phase, sentiment, irony, likes, shares, comments, virality score, and days since emergence. That is useful because it gives us different types of information at once. Some columns describe the language itself, some describe the social media environment, and others measure attention and engagement. Because of that, the dataset is not limited to one question. It gives us several angles for analysis, such as time, geography, platform culture, and popularity.


### Problematic

This project is an interactive visualization about how Gen Z slang evolves and spreads across various platforms. The idea is to show that slang is not fixed: a term can appear on one platform, become popular very quickly, spread to other platforms, and then slowly disappear or lose attention. So instead of treating it as just a list of trendy words, our main motivation is to present it as something dynamic that follows its own lifecycle. The visualization will make these changes easier to see by connecting slang to time, platforms, and visibility.

Internet slang is everywhere, especially on platforms used by younger people, but its evolution is usually not shown in a clear visual way. It is interesting because slang lets us see how online trends are born, spread across platforms, and fade, which says a lot about how digital culture works. We liked the idea of working on something connected to online culture while still using a structured dataset that allows us to build a real visual story. The topic is also accessible, which makes our target audience fairly broad. We imagine this visualization being understandable for students, young adults, and more generally anyone interested in internet culture, social media, or digital trends. We do not want to make something only for experts. The goal is to create something visually clear enough so that even someone with no background in data visualization can understand the main message.

At the center of the project is the following question: How does Gen Z slang evolve and spread across social media platforms between 2020 and 2025?
From that, the main axis of the visualization becomes clear: the evolution of slang over time and across platforms.

### Exploratory Data Analysis
Our first exploratory data analysis started with a preprocessing step to check whether the dataset needed cleaning before visualization. After loading the CSV file, we found that it contains 535,396 rows and 22 columns. We then checked for missing values and found that all columns contain 0 missing values. We also checked for duplicate rows and found 0 duplicates. This shows that the dataset is already very clean, so we do not need heavy preprocessing before starting the analysis.

Even if the dataset does not have missing values or duplicates, some preparation was still necessary. For example, the timestamp column was stored as text, so it should be converted into a real datetime format before making visualizations based on time. Some other columns, such as origin_platform or lifecycle_phase should also be treated as categorical variables. This will make the analysis more consistent and the visualizations easier to build.
Moreover, the descriptive statistics already give some useful insights. The dataset contains 46 unique slang terms and 22 regions, which suggests enough variety to compare different trends. 

The numerical variables also show interesting patterns. In particular, the maximum values for likes, shares, and comments are much higher than their median values, which suggests that the dataset includes some highly viral observations. This means that engagement is probably very uneven, with a small number of cases receiving much more attention than the rest. That is something we will need to keep in mind when designing the final visualizations.

Overall, the dataset is both clean and rich in information.In our case, preprocessing is mainly about formatting and organizing the data rather than correcting major errors. The results mentioned in this section come directly from our exploratory notebook.


### Related work
There is already some work related to this dataset on Kaggle. It is especially in the form of exploratory notebooks, which usually focus on the first analytical steps, such as loading the dataset, checking the variables, looking at distributions, and creating a few basic charts. That kind of work is useful for us because it confirms that the dataset is workable and that it contains enough variety for interesting analysis. At the same time, it also shows the limit of basic exploration. If we only produce standard summary plots, our project would not really stand out.

What we want to do differently is focus more on the story behind the data by presenting it as a timeline of emergence, spread, popularity, and decline. In other words, we want to use the dataset to explain a dynamic process. That gives the project a more original angle, because it turns the analysis into a narrative about how online language changes inside different digital spaces. We are especially interested in showing movement between origin platform and usage platform, because that feels like one of the most meaningful parts of the dataset.

For inspiration, we are thinking less about copying one exact example and more about the general style of data stories that are easy to explore and understand. Since our topic is internet slang, we think the final project should feel accessible, visually clear, and maybe even a little playful. We do not want something overloaded with technical details that makes people lose interest immediately.So the originality of our project comes mainly from the way we want to frame the data, which is not just as descriptive statistics, but as a visual story about how language trends move through social media culture.


## Milestone 2 (17th April, 5pm)

**10% of the final grade**


## Milestone 3 (29th May, 5pm)

**80% of the final grade**


## Late policy

- < 24h: 80% of the grade for the milestone
- < 48h: 70% of the grade for the milestone

